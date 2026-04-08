import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function toCsvValue(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function tracksToCsv(tracks: any[]): string {
  const headers = [
    "track_id",
    "track_name",
    "isrc",
    "album_name",
    "missing_isrc",
    "missing_release_date",
    "duplicate_title",
    "probability_tier",
    "probability_score",
    "confidence",
    "playback_level",
    "age_bucket",
  ];

  const rows = tracks.map((track) => [
    track.track_id,
    track.track_name,
    track.isrc,
    track.album_name,
    track.metadata_flags?.missing_isrc,
    track.metadata_flags?.missing_release_date,
    track.metadata_flags?.duplicate_title,
    track.royalty_signal?.tier,
    track.royalty_signal?.score,
    track.royalty_signal?.confidence,
    track.playback_signals?.level,
    track.age_bucket,
  ]);

  return [
    headers.map(toCsvValue).join(","),
    ...rows.map((row) => row.map(toCsvValue).join(",")),
  ].join("\n");
}

export async function GET(req: NextRequest) {
  const scanId = req.nextUrl.searchParams.get("scanId") || "";
  if (!scanId) {
    return NextResponse.json({ error: "scanId is required" }, { status: 400 });
  }

  const scan = await prisma.royaltyScan.findUnique({ where: { id: scanId } });
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  if (scan.status !== "complete" || !scan.resultJson) {
    return NextResponse.json({ error: "Scan not complete" }, { status: 409 });
  }

  const result = scan.resultJson as any;
  const tracks = Array.isArray(result?.tracks) ? result.tracks : [];
  const csv = tracksToCsv(tracks);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="verseiq-scan-${scan.id}.csv"`,
    },
  });
}