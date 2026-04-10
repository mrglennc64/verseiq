import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDefaultTenant, getCurrentTenantId } from "@/lib/tenant";
import { getArtist, getArtistAlbumsAll, getAlbumTracks } from "@/lib/spotifyClient";

export const runtime = "nodejs";

const ISRC_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

/**
 * Accepts a raw Spotify artist URL, URI, or ID and returns the bare ID.
 * Handles: https://open.spotify.com/artist/xxx, spotify:artist:xxx, or just xxx.
 */
function extractSpotifyArtistId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // spotify:artist:ID
  const uriMatch = /^spotify:artist:([A-Za-z0-9]+)$/.exec(s);
  if (uriMatch) return uriMatch[1];
  // https://open.spotify.com/artist/ID[?si=...]
  const urlMatch = /open\.spotify\.com\/artist\/([A-Za-z0-9]+)/.exec(s);
  if (urlMatch) return urlMatch[1];
  // Plain ID (22 chars base62, but Spotify doesn't guarantee length — accept any alnum)
  if (/^[A-Za-z0-9]+$/.test(s)) return s;
  return null;
}

type ImportBody = {
  artistId?: string;
  spotifyArtist?: string;
};

/**
 * POST /api/recordings/import-spotify
 * Body: { artistId, spotifyArtist }
 *
 * Fetches all albums + tracks for the given Spotify artist, extracts ISRCs,
 * and creates Recording rows for every unique ISRC not already in the catalog
 * for the current tenant. Returns counts of created/skipped/invalid.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ImportBody;
    const localArtistId = body.artistId?.trim();
    const spotifyRaw = body.spotifyArtist?.trim();

    if (!localArtistId) {
      return NextResponse.json({ error: "artistId is required" }, { status: 400 });
    }
    if (!spotifyRaw) {
      return NextResponse.json(
        { error: "spotifyArtist is required (URL, URI, or ID)" },
        { status: 400 },
      );
    }

    const spotifyArtistId = extractSpotifyArtistId(spotifyRaw);
    if (!spotifyArtistId) {
      return NextResponse.json(
        { error: "Could not parse Spotify artist URL/ID" },
        { status: 400 },
      );
    }

    await ensureDefaultTenant();
    const tenantId = getCurrentTenantId();

    const localArtist = await prisma.artist.findFirst({
      where: { id: localArtistId, tenantId },
    });
    if (!localArtist) {
      return NextResponse.json({ error: "artistId does not exist" }, { status: 404 });
    }

    // 1) Verify the Spotify artist exists (so we fail early on bad IDs)
    let spotifyArtist: any;
    try {
      spotifyArtist = await getArtist(spotifyArtistId);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Spotify artist lookup failed: ${err?.message ?? err}` },
        { status: 502 },
      );
    }

    // 2) Pull all albums for the artist
    const albums = await getArtistAlbumsAll(spotifyArtistId);

    // 3) For each album, pull tracks (enriched with external_ids/isrc)
    //    Dedupe by ISRC across all albums.
    type Candidate = {
      isrc: string;
      title: string;
      releaseDate: Date | null;
      label: string | null;
      upc: string | null;
    };
    const byIsrc = new Map<string, Candidate>();

    for (const album of albums) {
      let albumTracks;
      try {
        albumTracks = await getAlbumTracks(album.id);
      } catch (err: any) {
        // Skip this album but keep going — one bad album shouldn't kill the whole import.
        continue;
      }

      const releaseDateStr = album?.release_date as string | undefined;
      let releaseDate: Date | null = null;
      if (releaseDateStr) {
        // Spotify returns "YYYY", "YYYY-MM", or "YYYY-MM-DD"
        const padded =
          releaseDateStr.length === 4
            ? `${releaseDateStr}-01-01`
            : releaseDateStr.length === 7
              ? `${releaseDateStr}-01`
              : releaseDateStr;
        const d = new Date(padded);
        if (!Number.isNaN(d.getTime())) releaseDate = d;
      }

      const label = typeof album?.label === "string" ? album.label : null;
      const upc =
        typeof album?.external_ids?.upc === "string" ? album.external_ids.upc : null;

      for (const track of albumTracks.items ?? []) {
        const rawIsrc = track?.external_ids?.isrc as string | undefined;
        if (!rawIsrc) continue;
        const isrc = rawIsrc.toUpperCase().replace(/[-\s]/g, "");
        if (!ISRC_PATTERN.test(isrc)) continue;
        if (byIsrc.has(isrc)) continue; // dedupe across albums
        byIsrc.set(isrc, {
          isrc,
          title: String(track?.name ?? "Untitled").trim(),
          releaseDate,
          label,
          upc,
        });
      }
    }

    // 4) Filter out ISRCs already in the catalog for this tenant
    const candidateIsrcs = Array.from(byIsrc.keys());
    const existing = candidateIsrcs.length
      ? await prisma.recording.findMany({
          where: { tenantId, isrc: { in: candidateIsrcs } },
          select: { isrc: true },
        })
      : [];
    const existingSet = new Set(existing.map((r) => r.isrc));

    const toCreate = Array.from(byIsrc.values()).filter((c) => !existingSet.has(c.isrc));

    // 5) Bulk create. SQLite via Prisma doesn't return rows from createMany, so
    //    we just count and then refetch for the UI reload.
    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.recording.createMany({
        data: toCreate.map((c) => ({
          tenantId,
          artistId: localArtistId,
          isrc: c.isrc,
          title: c.title,
          releaseDate: c.releaseDate,
          label: c.label,
          upc: c.upc,
        })),
      });
      created = result.count;
    }

    return NextResponse.json({
      spotifyArtistName: spotifyArtist?.name ?? null,
      albumsScanned: albums.length,
      isrcsFound: candidateIsrcs.length,
      skippedExisting: candidateIsrcs.length - toCreate.length,
      created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to import from Spotify" },
      { status: 500 },
    );
  }
}
