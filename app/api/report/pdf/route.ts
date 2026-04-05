import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

type TerritoryRow = {
  territory: string;
  pro: string;
  playlists: number;
  followers: number;
  minRoyalty: number;
  maxRoyalty: number;
  needsManualProCheck: boolean;
};

type ProbeTrack = {
  title: string;
  artist: string;
  isrc?: string | null;
  likelyGap?: string;
};

async function buildPdfBuffer(payload: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const artistName = payload?.artistName || "Unknown artist";
    const audit = payload?.audit || {};
    const probe = payload?.probe || {};
    const feePct = Number(payload?.feePct ?? 0.2);

    doc.fontSize(18).text("VerseIQ Royalty Audit Report", { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(12).text(`Artist: ${artistName}`);
    doc.text(`Date: ${new Date().toISOString().slice(0, 10)}`);

    doc.moveDown();
    doc.fontSize(14).text("Executive Summary");
    const globalMin = Number(audit?.globalMin ?? 0);
    const globalMax = Number(audit?.globalMax ?? 0);
    doc.fontSize(11).text(`Estimated unclaimed royalties: EUR ${globalMin.toFixed(0)} - EUR ${globalMax.toFixed(0)}`);
    doc.text(`Royalty Health Score: ${Number(audit?.healthScore ?? 0)} / 100`);

    doc.moveDown();
    doc.fontSize(14).text("Territory Insights");
    const territoryRows: TerritoryRow[] = Array.isArray(audit?.territoryRows) ? audit.territoryRows : [];
    territoryRows.forEach((row) => {
      doc
        .fontSize(10)
        .text(
          `${row.territory} (${row.pro}) | playlists: ${row.playlists} | followers: ${row.followers} | EUR ${row.minRoyalty.toFixed(0)} - ${row.maxRoyalty.toFixed(0)} | manual PRO check: ${row.needsManualProCheck ? "Yes" : "No"}`
        );
    });

    doc.moveDown();
    doc.fontSize(14).text("Revenue Breakdown");
    doc
      .fontSize(10)
      .text(
        `Streaming: EUR ${Number(audit?.split?.streaming?.min ?? 0).toFixed(0)} - EUR ${Number(audit?.split?.streaming?.max ?? 0).toFixed(0)}`
      )
      .text(
        `Publishing/Performance: EUR ${Number(audit?.split?.performance?.min ?? 0).toFixed(0)} - EUR ${Number(audit?.split?.performance?.max ?? 0).toFixed(0)}`
      )
      .text(
        `Neighboring rights: EUR ${Number(audit?.split?.neighboring?.min ?? 0).toFixed(0)} - EUR ${Number(audit?.split?.neighboring?.max ?? 0).toFixed(0)}`
      );

    doc.moveDown();
    doc.fontSize(14).text("Manual PRO Check Checklist");
    territoryRows
      .filter((row) => row.needsManualProCheck)
      .forEach((row) => {
        doc.fontSize(10).text(`- ${row.territory} (${row.pro}): check repertoire for ${artistName} and key works.`);
      });

    const tracks: ProbeTrack[] = Array.isArray(probe?.tracks) ? probe.tracks : [];
    if (tracks.length > 0) {
      doc.moveDown();
      doc.fontSize(14).text("Rights Probe Highlights");
      tracks.slice(0, 20).forEach((track) => {
        doc
          .fontSize(10)
          .text(`- ${track.title} / ${track.artist} / ISRC: ${track.isrc || "n/a"} / ${track.likelyGap || ""}`);
      });
    }

    doc.moveDown();
    doc.fontSize(14).text("Fee & Engagement");
    doc
      .fontSize(10)
      .text(`Estimated recovery fee (${(feePct * 100).toFixed(0)}%): EUR ${(globalMin * feePct).toFixed(0)} - EUR ${(globalMax * feePct).toFixed(0)}`)
      .text("No upfront cost. No ownership taken.");

    doc.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const pdf = await buildPdfBuffer(payload);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=verseiq-audit-${Date.now()}.pdf`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "PDF generation failed", details: String(error) },
      { status: 500 }
    );
  }
}
