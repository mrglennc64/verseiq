// Generates the SoundExchange packet cover-sheet PDF.
//
// Uses pdf-lib (already a project dep via the LOD slice) so we don't pull in a
// second PDF library. The layout intentionally mirrors the plain-text-then-
// wrap approach from app/api/lod/generate/route.ts so both PDFs look like
// they come from the same product.

import { PDFDocument, StandardFonts } from "pdf-lib";
import type { Artist } from "@prisma/client";

export type SummaryInput = {
  artist: Pick<
    Artist,
    | "legalName"
    | "stageName"
    | "address"
    | "email"
    | "countryCode"
    | "bankCountryCode"
    | "primaryGenre"
    | "dateOfBirth"
  >;
  recordingCount: number;
  lodCount: number;
  generatedAt: Date;
};

function formatDob(dob: Date | null | undefined): string {
  if (!dob) return "—";
  return new Date(dob).toISOString().slice(0, 10);
}

function buildSummaryText(input: SummaryInput): string {
  const { artist, recordingCount, lodCount, generatedAt } = input;
  const displayName = artist.stageName || artist.legalName;

  return [
    `SoundExchange Registration Packet`,
    `Prepared by VerseIQ`,
    ``,
    `Generated: ${generatedAt.toISOString().slice(0, 19).replace("T", " ")} UTC`,
    ``,
    `Artist`,
    `  Display name:     ${displayName}`,
    `  Legal name:       ${artist.legalName}`,
    `  Date of birth:    ${formatDob(artist.dateOfBirth)}`,
    `  Country:          ${artist.countryCode || "—"}`,
    `  Bank country:     ${artist.bankCountryCode || "—"}`,
    `  Primary genre:    ${artist.primaryGenre || "—"}`,
    `  Contact email:    ${artist.email || "—"}`,
    `  Mailing address:  ${artist.address || "—"}`,
    ``,
    `Packet contents`,
    `  • Catalog CSV       (${recordingCount} recording${recordingCount === 1 ? "" : "s"})`,
    `  • Letters of Direction  (${lodCount} LOD${lodCount === 1 ? "" : "s"})`,
    `  • This summary cover sheet`,
    ``,
    `Next steps`,
    `  1. Download the packet from your VerseIQ Registration Hub.`,
    `  2. Create or sign into your SoundExchange account at soundexchange.com.`,
    `  3. Upload the catalog CSV and LOD bundle into SE's onboarding flow.`,
    `  4. Complete SE's identity + tax + banking verification steps.`,
    `  5. Return to VerseIQ and mark the SoundExchange card as "Submitted".`,
    ``,
    `Note: SoundExchange requires each artist to personally verify tax and`,
    `banking details. VerseIQ prepares the catalog and paperwork, but the`,
    `final verification must be completed by the artist.`,
  ].join("\n");
}

export async function buildSummaryPdf(input: SummaryInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const fontSize = 11;
  const lineHeight = fontSize * 1.4;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const usableWidth = pageWidth - margin * 2;

  const wrap = (line: string): string[] => {
    if (line === "") return [""];
    const words = line.split(" ");
    const out: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) > usableWidth && current) {
        out.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) out.push(current);
    return out;
  };

  const text = buildSummaryText(input);
  const lines = text.split("\n").flatMap(wrap);

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of lines) {
    if (y < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  }

  return pdf.save();
}
