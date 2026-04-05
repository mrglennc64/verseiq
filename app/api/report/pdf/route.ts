import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

type USAuditTrack = {
  isrc: string;
  missingInSoundExchange: boolean;
  usPlaylistFollowers: number;
  usRadioLinkedPlaylists: number;
  score: number;
};

type USProbePayload = {
  artistName?: string;
  feePercent?: number;
  audit?: {
    totalEstimatedRange?: { min?: number; max?: number };
    feeRange?: { min?: number; max?: number };
    tracks?: USAuditTrack[];
  };
  artistScore?: { recoveryPotentialScore?: number };
  seGaps?: Array<{ isrc?: string; reason?: string }>;
  lod?: string;
};

async function buildPdfBytes(payload: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]);
  const margin = 40;
  let y = 802;

  const drawLine = (text: string, size = 10, isBold = false) => {
    if (y < 60) {
      page = pdf.addPage([595, 842]);
      y = 802;
    }
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: 515,
      lineHeight: size + 2,
    });
    y -= size + 6;
  };

  const drawParagraph = (text: string, size = 9) => {
    const maxChars = 96;
    const chunks = text.match(new RegExp(`.{1,${maxChars}}`, "g")) || [text];
    chunks.forEach((chunk) => drawLine(chunk, size));
  };

  const isUSMode = payload?.mode === "us" || payload?.usProbe;

  if (isUSMode) {
    const us: USProbePayload = payload?.usProbe || payload || {};
    const artistName = us?.artistName || payload?.artistName || "Unknown artist";
    const feePercent = Number(us?.feePercent ?? 20);
    const totalMin = Number(us?.audit?.totalEstimatedRange?.min ?? 0);
    const totalMax = Number(us?.audit?.totalEstimatedRange?.max ?? 0);
    const feeMin = Number(us?.audit?.feeRange?.min ?? 0);
    const feeMax = Number(us?.audit?.feeRange?.max ?? 0);
    const score = Number(us?.artistScore?.recoveryPotentialScore ?? 0);
    const tracks: USAuditTrack[] = Array.isArray(us?.audit?.tracks) ? us.audit!.tracks! : [];
    const seGaps = Array.isArray(us?.seGaps) ? us.seGaps : [];

    drawLine("VerseIQ US Royalty Audit", 18, true);
    drawLine(`Artist: ${artistName}`, 12);
    drawLine(`Date: ${new Date().toISOString().slice(0, 10)}`, 11);
    y -= 6;

    drawLine("Executive Summary", 14, true);
    drawLine(`Estimated unclaimed US royalties: EUR ${totalMin.toFixed(0)} - EUR ${totalMax.toFixed(0)}`);
    drawLine(`US Recovery Potential Score: ${score} / 100`);
    drawLine(`Estimated recovery fee (${feePercent.toFixed(0)}%): EUR ${feeMin.toFixed(0)} - EUR ${feeMax.toFixed(0)}`);
    y -= 6;

    drawLine("SoundExchange Gaps", 14, true);
    if (seGaps.length === 0) {
      drawLine("No SoundExchange registration gaps detected.");
    } else {
      seGaps.slice(0, 30).forEach((gap) => {
        drawLine(`- ${gap.isrc || "n/a"}: ${gap.reason || "Missing in SoundExchange repertoire"}`);
      });
    }
    y -= 6;

    drawLine("Track-Level US Recovery Potential", 14, true);
    tracks.slice(0, 40).forEach((track) => {
      drawLine(
        `${track.isrc} | missing SE: ${track.missingInSoundExchange ? "Yes" : "No"} | followers: ${track.usPlaylistFollowers} | radio playlists: ${track.usRadioLinkedPlaylists} | score: ${track.score}`
      );
    });

    if (us?.lod) {
      y -= 8;
      drawLine("LOD Appendix", 14, true);
      drawParagraph(String(us.lod), 8);
    }

    return pdf.save();
  }

  const artistName = payload?.artistName || "Unknown artist";
  const audit = payload?.audit || {};
  const probe = payload?.probe || {};
  const feePct = Number(payload?.feePct ?? 0.2);

  const globalMin = Number(audit?.globalMin ?? 0);
  const globalMax = Number(audit?.globalMax ?? 0);
  const territoryRows: TerritoryRow[] = Array.isArray(audit?.territoryRows) ? audit.territoryRows : [];
  const tracks: ProbeTrack[] = Array.isArray(probe?.tracks) ? probe.tracks : [];

  drawLine("VerseIQ Royalty Audit Report", 18, true);
  drawLine(`Artist: ${artistName}`, 12);
  drawLine(`Date: ${new Date().toISOString().slice(0, 10)}`, 11);
  y -= 6;

  drawLine("Executive Summary", 14, true);
  drawLine(`Estimated unclaimed royalties: EUR ${globalMin.toFixed(0)} - EUR ${globalMax.toFixed(0)}`);
  drawLine(`Royalty Health Score: ${Number(audit?.healthScore ?? 0)} / 100`);
  y -= 6;

  drawLine("Territory Insights", 14, true);
  territoryRows.forEach((row) => {
    drawLine(
      `${row.territory} (${row.pro}) | playlists: ${row.playlists} | followers: ${row.followers} | EUR ${row.minRoyalty.toFixed(0)} - ${row.maxRoyalty.toFixed(0)} | manual PRO check: ${row.needsManualProCheck ? "Yes" : "No"}`
    );
  });
  y -= 6;

  drawLine("Revenue Breakdown", 14, true);
  drawLine(`Streaming: EUR ${Number(audit?.split?.streaming?.min ?? 0).toFixed(0)} - EUR ${Number(audit?.split?.streaming?.max ?? 0).toFixed(0)}`);
  drawLine(`Publishing/Performance: EUR ${Number(audit?.split?.performance?.min ?? 0).toFixed(0)} - EUR ${Number(audit?.split?.performance?.max ?? 0).toFixed(0)}`);
  drawLine(`Neighboring rights: EUR ${Number(audit?.split?.neighboring?.min ?? 0).toFixed(0)} - EUR ${Number(audit?.split?.neighboring?.max ?? 0).toFixed(0)}`);
  y -= 6;

  drawLine("Manual PRO Check Checklist", 14, true);
  territoryRows
    .filter((row) => row.needsManualProCheck)
    .forEach((row) => drawLine(`- ${row.territory} (${row.pro}): check repertoire for ${artistName} and key works.`));

  if (tracks.length > 0) {
    y -= 6;
    drawLine("Rights Probe Highlights", 14, true);
    tracks.slice(0, 20).forEach((track) => {
      drawLine(`- ${track.title} / ${track.artist} / ISRC: ${track.isrc || "n/a"} / ${track.likelyGap || ""}`);
    });
  }

  y -= 6;
  drawLine("Fee & Engagement", 14, true);
  drawLine(`Estimated recovery fee (${(feePct * 100).toFixed(0)}%): EUR ${(globalMin * feePct).toFixed(0)} - EUR ${(globalMax * feePct).toFixed(0)}`);
  drawLine("No upfront cost. No ownership taken.");

  return pdf.save();
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const pdfBytes = await buildPdfBytes(payload);
    const stableBytes = Uint8Array.from(pdfBytes);
    const pdfBlob = new Blob([stableBytes], { type: "application/pdf" });

    return new NextResponse(pdfBlob, {
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
