// Orchestrates building a full SoundExchange registration packet for an artist.
//
// Pipeline:
//   1. Load Artist + Recordings + existing LODs
//   2. Run validator — throw structured error if not ok
//   3. Build catalog CSV bytes
//   4. Build summary PDF bytes
//   5. Merge existing LOD PDFs into a single bundle PDF
//   6. Hash the concatenated contents for change detection
//   7. Write files under storage/soundexchange/<packetId>/
//   8. Create SoundexchangePacket row (status=GENERATED)
//   9. Call onPacketGenerated() to advance Registration Hub status
//
// LOD discovery note: the Lod model does NOT have an artistId FK yet — LODs
// are matched to the Artist by exact artistLegalName string equality. This is
// consistent with the "bridge later" pattern already used for scans→Artist.
// When the LOD↔Artist bridge lands, swap the lookup here and delete this note.

import { createHash } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/db";
import { onPacketGenerated } from "@/lib/registration/hooks";
import { buildCatalogCsv } from "./catalogCsv";
import { buildSummaryPdf } from "./summaryPdf";
import {
  validateArtistForSoundexchange,
  type SoundexchangeValidationResult,
} from "./validator";

export class SoundexchangePacketValidationError extends Error {
  readonly validation: SoundexchangeValidationResult;
  constructor(validation: SoundexchangeValidationResult) {
    super("SoundExchange packet validation failed");
    this.name = "SoundexchangePacketValidationError";
    this.validation = validation;
  }
}

export type BuildPacketResult = {
  packetId: string;
  hash: string;
  files: {
    catalogCsvPath: string;
    summaryPdfPath: string;
    lodBundlePath: string;
  };
  validation: SoundexchangeValidationResult;
};

// Merge one or more LOD PDFs into a single bundle PDF. Falls back to an
// empty single-page document if the input list is empty (shouldn't happen in
// practice because the validator requires lodCount > 0, but we keep this
// defensive so callers can choose to bypass validation for tests).
async function mergeLodPdfs(absolutePaths: string[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const abs of absolutePaths) {
    const bytes = await readFile(abs);
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }
  if (merged.getPageCount() === 0) merged.addPage();
  return merged.save();
}

export async function buildSoundexchangePacket(
  artistId: string
): Promise<BuildPacketResult> {
  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) {
    throw new Error(`Artist ${artistId} not found`);
  }

  const recordings = await prisma.recording.findMany({
    where: { artistId },
    orderBy: { createdAt: "asc" },
  });

  // LODs are discovered by legal-name match (see note at top of file).
  const lods = artist.legalName
    ? await prisma.lod.findMany({
        where: { artistLegalName: artist.legalName },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const validation = validateArtistForSoundexchange(
    artist,
    recordings,
    lods.length
  );
  if (!validation.ok) {
    throw new SoundexchangePacketValidationError(validation);
  }

  // Build artifacts in memory first so we can hash before writing.
  const csvText = buildCatalogCsv(artist, recordings);
  const csvBytes = Buffer.from(csvText, "utf8");

  const summaryBytes = await buildSummaryPdf({
    artist,
    recordingCount: recordings.length,
    lodCount: lods.length,
    generatedAt: new Date(),
  });

  const lodAbsolutePaths = lods.map((l) =>
    path.isAbsolute(l.pdfPath) ? l.pdfPath : path.join(process.cwd(), l.pdfPath)
  );
  const lodBundleBytes = await mergeLodPdfs(lodAbsolutePaths);

  // Hash the three artifacts together so regenerating with unchanged inputs
  // produces the same hash and the caller can short-circuit.
  const hash = createHash("sha256")
    .update(csvBytes)
    .update(summaryBytes)
    .update(lodBundleBytes)
    .digest("hex");

  // Create the row first so the id is available for the storage path.
  const packet = await prisma.soundexchangePacket.create({
    data: {
      artistId,
      status: "DRAFT",
      hash,
    },
  });

  const relDir = path.join("storage", "soundexchange", packet.id);
  const absDir = path.join(process.cwd(), relDir);
  await mkdir(absDir, { recursive: true });

  const relCsv = path.join(relDir, "catalog.csv");
  const relSummary = path.join(relDir, "summary.pdf");
  const relBundle = path.join(relDir, "lods.pdf");

  await writeFile(path.join(process.cwd(), relCsv), csvBytes);
  await writeFile(path.join(process.cwd(), relSummary), summaryBytes);
  await writeFile(path.join(process.cwd(), relBundle), lodBundleBytes);

  await prisma.soundexchangePacket.update({
    where: { id: packet.id },
    data: {
      status: "GENERATED",
      catalogCsvPath: relCsv,
      summaryPdfPath: relSummary,
      lodBundlePath: relBundle,
      generatedAt: new Date(),
    },
  });

  // Advance the Registration Hub status. Do NOT write to RegistrationStatus
  // directly — all audit/logging concentrates in lib/registration/hooks.ts.
  await onPacketGenerated(artistId, "SOUNDEXCHANGE");

  return {
    packetId: packet.id,
    hash,
    files: {
      catalogCsvPath: relCsv,
      summaryPdfPath: relSummary,
      lodBundlePath: relBundle,
    },
    validation,
  };
}
