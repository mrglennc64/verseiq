import { NextRequest, NextResponse } from "next/server";
import { inferTerritoryFromPlaylist, type PlaylistMetadata } from "../../verseiq/territory";
import { markRadioLinked } from "../../verseiq/radioDetector";
import type { PlaylistInfo, TrackISRCRecord } from "../../verseiq/types";
import { buildUSPriorityAudit, type SoundExchangeMatch } from "../../verseiq/usAudit";
import { detectSoundExchangeGaps } from "../../verseiq/soundexchangeMissing";
import { computeUSArtistScore } from "../../verseiq/usScores";
import { generateSoundExchangeLOD } from "../../verseiq/lodTemplate";
import { renderUSAuditHTML } from "../../verseiq/usReportTemplate";

type USProbePayload = {
  artistName?: string;
  tracks?: Array<{
    isrc?: string | null;
    title?: string;
    artist?: string;
  }>;
  playlists?: PlaylistMetadata[];
  soundExchangeMatches?: SoundExchangeMatch[];
  feePercent?: number;
  lod?: {
    artistLegalName?: string;
    artistAddress?: string;
    artistEmail?: string;
    representativeName?: string;
    representativeEntity?: string;
  };
};

function normalizeFeePercent(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return 20;
  }
  if (value <= 1) {
    return value * 100;
  }
  return value;
}

function toTrackRecords(inputTracks: USProbePayload["tracks"]): TrackISRCRecord[] {
  if (!Array.isArray(inputTracks)) {
    return [];
  }

  const seen = new Set<string>();
  const records: TrackISRCRecord[] = [];
  for (const t of inputTracks) {
    const isrc = String(t?.isrc || "").trim();
    const title = String(t?.title || "").trim();
    const artist = String(t?.artist || "").trim();
    if (!isrc || !title || !artist || seen.has(isrc)) {
      continue;
    }
    seen.add(isrc);
    records.push({ isrc, title, artist });
  }
  return records;
}

function toUSPlaylists(playlists: PlaylistMetadata[]): PlaylistInfo[] {
  const normalized = playlists
    .filter((p) => inferTerritoryFromPlaylist(p) === "US")
    .map((p) => ({
      id: p.id,
      name: p.name,
      followers: Number(p.followers || 0),
      description: p.description || "",
      ownerName: p.ownerName || "",
      ownerType: p.ownerType || "",
      isEditorial: Boolean(p.isEditorial),
      territory: "US" as const,
      isRadioLinked: false,
      valueScore: 0,
    }));

  return markRadioLinked(normalized);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as USProbePayload;
    const artistName = String(body?.artistName || "").trim();
    const tracks = toTrackRecords(body?.tracks);

    if (!artistName) {
      return NextResponse.json({ error: "Missing artistName" }, { status: 400 });
    }

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "No valid ISRC tracks provided. Run rights probe first to resolve ISRCs." },
        { status: 400 }
      );
    }

    const feePercent = normalizeFeePercent(body?.feePercent);
    const inputPlaylists = Array.isArray(body?.playlists) ? body.playlists : [];
    const usPlaylists = toUSPlaylists(inputPlaylists);
    const soundExchangeMatches = Array.isArray(body?.soundExchangeMatches)
      ? body.soundExchangeMatches
      : [];

    const audit = buildUSPriorityAudit({
      artistName,
      tracks,
      soundExchangeMatches,
      usPlaylists,
      feePercent,
    });

    const seGaps = detectSoundExchangeGaps(tracks, soundExchangeMatches);
    const artistScore = computeUSArtistScore(audit);
    const date = new Date().toISOString().slice(0, 10);

    const lod = generateSoundExchangeLOD({
      artistLegalName: body?.lod?.artistLegalName || artistName,
      artistAddress: body?.lod?.artistAddress || "Address to be completed",
      artistEmail: body?.lod?.artistEmail || "Email to be completed",
      representativeName: body?.lod?.representativeName || "VerseIQ Representative",
      representativeEntity: body?.lod?.representativeEntity || "VerseIQ",
      feePercent,
      isrcs: tracks.map((t) => t.isrc),
      date,
    });

    const reportHtml = renderUSAuditHTML({
      artistName,
      date,
      audit,
      artistScore,
      seGaps,
      feePercent,
    });

    return NextResponse.json({
      artistName,
      date,
      feePercent,
      inputCounts: {
        tracks: tracks.length,
        usPlaylists: usPlaylists.length,
      },
      audit,
      artistScore,
      seGaps,
      lod,
      reportHtml,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "US probe failed", details: String(error) },
      { status: 500 }
    );
  }
}
