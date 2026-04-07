import { NextRequest, NextResponse } from "next/server";
import {
  getAlbumTracksAll,
  getArtist,
  getArtistAlbumsAll,
  getTracksByIds,
} from "../../../../lib/spotifyClient";

export const runtime = "nodejs";

function normalizeIsrc(input: string | null | undefined) {
  if (!input) return null;
  const v = input.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
  return v || null;
}

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json({ error: "artistId required" }, { status: 400 });
  }

  try {
    const artist = await getArtist(artistId);
    const albums = await getArtistAlbumsAll(artistId);

    const trackRows: Array<{
      track_id: string;
      track_name: string;
      isrc: string | null;
      album_id: string;
      album_name: string;
      release_date: string;
      spotify_track_id: string;
      spotify_album_id: string;
    }> = [];

    for (const album of albums) {
      const albumTracks = await getAlbumTracksAll(album.id);
      const ids = albumTracks.map((t: any) => t?.id).filter(Boolean);
      const fullTracks = await getTracksByIds(ids);
      const fullById = new Map(fullTracks.map((t: any) => [t.id, t]));

      for (const t of albumTracks) {
        const full = fullById.get(t.id);
        const isrc = normalizeIsrc(full?.external_ids?.isrc);

        trackRows.push({
          track_id: t.id,
          track_name: t.name,
          isrc,
          album_id: album.id,
          album_name: album.name,
          release_date: album.release_date,
          spotify_track_id: t.id,
          spotify_album_id: album.id,
        });
      }
    }

    const deduped = new Map<string, (typeof trackRows)[number]>();
    for (const row of trackRows) {
      if (!row.track_id) {
        continue;
      }

      if (row.isrc) {
        const existing = deduped.get(row.isrc);
        if (!existing || (row.release_date || "") > (existing.release_date || "")) {
          deduped.set(row.isrc, row);
        }
      } else {
        const fallbackKey = `NO_ISRC::${row.track_id}`;
        if (!deduped.has(fallbackKey)) {
          deduped.set(fallbackKey, row);
        }
      }
    }

    const tracks = Array.from(deduped.values()).map((row) => ({
      track_id: row.track_id,
      track_name: row.track_name,
      isrc: row.isrc,
      album_id: row.album_id,
      album_name: row.album_name,
      release_date: row.release_date,
    }));

    const auditPayload = {
      source: "spotify",
      artist_id: artist.id,
      artist_name: artist.name,
      tracks: Array.from(deduped.values()).map((row) => ({
        isrc: row.isrc,
        track_name: row.track_name,
        spotify_track_id: row.spotify_track_id,
        spotify_album_id: row.spotify_album_id,
        album_name: row.album_name,
        release_date: row.release_date,
        territory: "global",
        notes: "catalog snapshot",
      })),
    };

    return NextResponse.json({
      artist: {
        id: artist.id,
        name: artist.name,
        genres: artist.genres,
        popularity: artist.popularity,
      },
      albums: albums.map((a: any) => ({
        id: a.id,
        name: a.name,
        release_date: a.release_date,
        total_tracks: a.total_tracks,
      })),
      tracks,
      audit_payload: auditPayload,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
