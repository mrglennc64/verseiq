import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "@/lib/db";
import { generateSoundExchangeLOD } from "@/app/verseiq/lodTemplate";

export const runtime = "nodejs";

type GenerateBody = {
  artistLegalName?: string;
  artistAddress?: string;
  artistEmail?: string;
  representativeName?: string;
  representativeEntity?: string;
  feePercent?: number;
  isrcs?: string[];
  date?: string;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

async function renderTextToPdf(text: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const fontSize = 10;
  const lineHeight = fontSize * 1.35;
  const margin = 50;
  const pageWidth = 612; // US Letter
  const pageHeight = 792;
  const usableWidth = pageWidth - margin * 2;

  // Wrap each source line to fit page width.
  const wrap = (line: string): string[] => {
    if (line === "") return [""];
    const words = line.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);
      if (width > usableWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const wrapped = text.split("\n").flatMap(wrap);

  let page = pdf.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - margin;

  for (const line of wrapped) {
    if (cursorY < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - margin;
    }
    page.drawText(line, {
      x: margin,
      y: cursorY,
      size: fontSize,
      font,
    });
    cursorY -= lineHeight;
  }

  return pdf.save();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as GenerateBody;

    const artistLegalName = requireString(body.artistLegalName, "artistLegalName");
    const artistAddress = requireString(body.artistAddress, "artistAddress");
    const artistEmail = requireString(body.artistEmail, "artistEmail");
    const representativeName = requireString(body.representativeName, "representativeName");
    const representativeEntity = requireString(body.representativeEntity, "representativeEntity");

    const feePercent = Number(body.feePercent);
    if (!Number.isFinite(feePercent) || feePercent <= 0 || feePercent > 50) {
      return NextResponse.json(
        { error: "feePercent must be a number between 0 and 50" },
        { status: 400 }
      );
    }

    const isrcs = Array.isArray(body.isrcs)
      ? body.isrcs.map((i) => String(i).trim()).filter(Boolean)
      : [];
    if (isrcs.length === 0) {
      return NextResponse.json({ error: "isrcs must be a non-empty array" }, { status: 400 });
    }

    const date = body.date?.trim() || new Date().toISOString().slice(0, 10);

    const lodText = generateSoundExchangeLOD({
      artistLegalName,
      artistAddress,
      artistEmail,
      representativeName,
      representativeEntity,
      feePercent,
      isrcs,
      date,
    });

    const pdfBytes = await renderTextToPdf(lodText);
    const pdfHash = createHash("sha256").update(pdfBytes).digest("hex");

    const storageDir = path.join(process.cwd(), "storage", "lods");
    await mkdir(storageDir, { recursive: true });

    const lod = await prisma.lod.create({
      data: {
        artistLegalName,
        artistAddress,
        artistEmail,
        representativeName,
        representativeEntity,
        feePercent,
        isrcs,
        pdfPath: "", // filled in below once we know the id
        pdfHash,
      },
    });

    const pdfPath = path.join("storage", "lods", `${lod.id}.pdf`);
    const absolutePath = path.join(process.cwd(), pdfPath);
    await writeFile(absolutePath, pdfBytes);

    const updated = await prisma.lod.update({
      where: { id: lod.id },
      data: { pdfPath },
    });

    return NextResponse.json({
      id: updated.id,
      pdfPath: updated.pdfPath,
      pdfHash: updated.pdfHash,
      isrcs,
      feePercent,
      createdAt: updated.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to generate LOD" },
      { status: 500 }
    );
  }
}
