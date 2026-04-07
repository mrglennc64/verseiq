import { NextRequest, NextResponse } from "next/server";
import { getArtist, getArtistAlbums, getAlbumTracks } from "@/lib/spotifyClient";
import { getCached, setCached, withRetry } from "@/lib/royalty/spotifyCache";

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json({ error: "artistId required" }, { status: 400 });
  }

  const cacheKey = `escrow-estimate:${artistId}`;
  const cached = getCached<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const result = await withRetry(async () => {
      const artist = await getArtist(artistId);
      const albumsRes = await getArtistAlbums(artistId);
      const albums = albumsRes.items ?? [];
      const tracks: any[] = [];

      for (const album of albums) {
        await new Promise((r) => setTimeout(r, 150));
        const albumTracksRes = await getAlbumTracks(album.id);
        for (const t of albumTracksRes.items ?? []) {
          tracks.push({
            track_id: t.id,
            track_name: t.name,
            isrc: t.external_ids?.isrc ?? null,
          });
        }
      }

      const missingIsrcs = tracks.filter((t) => !t.isrc);
      const assumedValuePerTrack = 100;

      return {
        artist: { id: artist.id, name: artist.name },
        total_tracks: tracks.length,
        missing_isrcs: missingIsrcs.length,
        estimated_escrow_usd: missingIsrcs.length * assumedValuePerTrack,
        model: {
          assumed_value_per_missing_track_usd: assumedValuePerTrack,
          notes: "Placeholder model. Replace with stream-based or territory-weighted estimates.",
        },
      };
    });

    setCached(cacheKey, result);
    return NextResponse.json(result);
  } catch (e: any) {
    const msg = e?.message ?? "unknown";
    const status = String(msg).includes("429") ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
