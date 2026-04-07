import type { CatalogPreviewRow, ExportedCatalog, SpotifySourceType } from "../types/spotifyCatalog";

type SpotifyInput =
  | { type: "artist"; id: string }
  | { type: "playlist"; id: string }
  | { type: "track"; id: string }
  | { type: "raw"; id: string };

type AlbumSummary = {
  id: string;
  name: string;
  release_date: string;
};

type CandidateTrack = {
  id: string;
  name: string;
  explicit: boolean;
  duration_ms: number;
  album: {
    id: string;
    name: string;
    release_date: string;
  };
  artists: Array<{ id: string; name: string }>;
};

type CollectedCatalog = {
  sourceType: SpotifySourceType;
  sourceId: string;
  sourceName: string;
  tracks: CandidateTrack[];
  artistId?: string;
  artistName?: string;
};

type CatalogRow = {
  isrc: string;
  track_name: string;
  artist_names: string;
  album_name: string;
  release_date: string;
  spotify_track_id: string;
  spotify_album_id: string;
  duration_ms: number;
  explicit: boolean;
};

export class SpotifyExportError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SpotifyExportError";
    this.status = status;
  }
}

function spotifyFetch(url: string, token: string) {
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

async function spotifyJson(url: string, token: string) {
  const response = await spotifyFetch(url, token);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || data?.details || `Spotify request failed (${response.status})`;
    throw new SpotifyExportError(message, response.status >= 500 ? 502 : response.status);
  }

  return data;
}

/**
 * Spotify apps in restricted quota modes reject large limit values.
 * Mirrors the Python tool's fallback strategy: try [20, 10, 5, 1].
 */
async function spotifyJsonWithLimitFallback(
  buildUrl: (limit: number) => string,
  token: string
) {
  const candidates = [20, 10, 5, 1];
  let lastError: SpotifyExportError | null = null;

  for (const limit of candidates) {
    try {
      return await spotifyJson(buildUrl(limit), token);
    } catch (err) {
      if (
        err instanceof SpotifyExportError &&
        err.message.toLowerCase().includes("invalid limit")
      ) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new SpotifyExportError("All limit values rejected by Spotify.", 400);
}

function parseSpotifyInput(input: string): SpotifyInput {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new SpotifyExportError("Paste a Spotify artist URL, playlist URL, or raw artist ID.", 400);
  }

  const artistMatch = trimmed.match(/artist\/([A-Za-z0-9]+)(?:\?|$)/);
  if (artistMatch) {
    return { type: "artist", id: artistMatch[1] };
  }

  const playlistMatch = trimmed.match(/playlist\/([A-Za-z0-9]+)(?:\?|$)/);
  if (playlistMatch) {
    return { type: "playlist", id: playlistMatch[1] };
  }

  const trackMatch = trimmed.match(/track\/([A-Za-z0-9]+)(?:\?|$)/);
  if (trackMatch) {
    return { type: "track", id: trackMatch[1] };
  }

  if (/open\.spotify\.com\//.test(trimmed)) {
    throw new SpotifyExportError("Please enter a Spotify artist URL or playlist URL. Track links are not supported here.", 400);
  }

  return { type: "raw", id: trimmed };
}

export function extractArtistId(input: string): string {
  const parsed = parseSpotifyInput(input);
  if (parsed.type === "playlist") {
    throw new SpotifyExportError("This workflow accepts playlist URLs directly. Use the main export action instead of artist-only parsing.", 400);
  }
  if (parsed.type === "track") {
    throw new SpotifyExportError("Please enter a Spotify Artist URL, not a track link.", 400);
  }
  return parsed.id;
}

function normalizeIsrc(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

function csvEscape(value: string | number | boolean): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function sortNewestFirst(rows: CatalogRow[]) {
  return rows.sort((left, right) => {
    const leftDate = left.release_date || "";
    const rightDate = right.release_date || "";
    if (leftDate === rightDate) {
      return left.track_name.localeCompare(right.track_name);
    }
    return rightDate.localeCompare(leftDate);
  });
}

function isMainOrFeatured(artists: Array<{ id: string; name: string }>, targetArtistId: string) {
  return artists.some((artist) => artist.id === targetArtistId);
}

function toPreviewRow(row: CatalogRow): CatalogPreviewRow {
  return {
    trackName: row.track_name,
    artistNames: row.artist_names,
    albumName: row.album_name,
    releaseDate: row.release_date,
    isrc: row.isrc,
  };
}

async function fetchAllAlbums(artistId: string, token: string) {
  const albums = new Map<string, AlbumSummary>();

  // First page uses limit-fallback so restricted-quota apps don't hard-fail.
  const firstData = await spotifyJsonWithLimitFallback(
    (limit) =>
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,appears_on&limit=${limit}`,
    token
  );

  let nextUrl: string = typeof firstData?.next === "string" ? firstData.next : "";
  const allPages = [firstData];
  while (nextUrl) {
    allPages.push(await spotifyJson(nextUrl, token));
    const last = allPages[allPages.length - 1];
    nextUrl = typeof last?.next === "string" ? last.next : "";
  }

  for (const data of allPages) {
    const items = Array.isArray(data?.items) ? data.items : [];
    for (const album of items) {
      if (!album?.id) {
        continue;
      }
      albums.set(album.id, {
        id: album.id,
        name: album.name || "",
        release_date: album.release_date || "",
      });
    }
  }

  return Array.from(albums.values());
}

async function fetchAlbumTracks(album: AlbumSummary, token: string) {
  const tracks: CandidateTrack[] = [];

  const firstData = await spotifyJsonWithLimitFallback(
    (limit) => `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=${limit}`,
    token
  );

  let nextUrl: string = typeof firstData?.next === "string" ? firstData.next : "";
  const allPages = [firstData];
  while (nextUrl) {
    allPages.push(await spotifyJson(nextUrl, token));
    const last = allPages[allPages.length - 1];
    nextUrl = typeof last?.next === "string" ? last.next : "";
  }

  for (const data of allPages) {
    const items = Array.isArray(data?.items) ? data.items : [];
    for (const track of items) {
      if (!track?.id) {
        continue;
      }
      tracks.push({
        id: track.id,
        name: track.name || "",
        explicit: Boolean(track.explicit),
        duration_ms: Number(track.duration_ms || 0),
        album: {
          id: album.id,
          name: album.name,
          release_date: album.release_date,
        },
        artists: Array.isArray(track.artists)
          ? track.artists.map((artist: any) => ({ id: String(artist.id || ""), name: String(artist.name || "") }))
          : [],
      });
    }
  }

  return tracks;
}

async function fetchPlaylistTracks(playlistId: string, token: string) {
  const tracks = new Map<string, CandidateTrack>();
  // Use limit=50 (not 100) — some Spotify quota modes reject values above 50.
  let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(id,name,explicit,duration_ms,is_local,album(id,name,release_date),artists(id,name))),next,total`;

  while (nextUrl) {
    const data = await spotifyJson(nextUrl, token);
    const items = Array.isArray(data?.items) ? data.items : [];
    for (const item of items) {
      const track = item?.track;
      if (!track?.id || track?.is_local) {
        continue;
      }

      const candidate: CandidateTrack = {
        id: track.id,
        name: track.name || "",
        explicit: Boolean(track.explicit),
        duration_ms: Number(track.duration_ms || 0),
        album: {
          id: String(track.album?.id || ""),
          name: String(track.album?.name || ""),
          release_date: String(track.album?.release_date || ""),
        },
        artists: Array.isArray(track.artists)
          ? track.artists.map((artist: any) => ({ id: String(artist.id || ""), name: String(artist.name || "") }))
          : [],
      };

      const existing = tracks.get(candidate.id);
      if (!existing || candidate.album.release_date > existing.album.release_date) {
        tracks.set(candidate.id, candidate);
      }
    }
    nextUrl = typeof data?.next === "string" ? data.next : "";
  }

  return Array.from(tracks.values());
}

async function fetchTrackDetails(trackIds: string[], token: string) {
  const detailedTracks = new Map<string, any>();

  for (let index = 0; index < trackIds.length; index += 50) {
    const chunk = trackIds.slice(index, index + 50);
    try {
      const detailData = await spotifyJson(
        `https://api.spotify.com/v1/tracks?${new URLSearchParams({ ids: chunk.join(",") }).toString()}`,
        token
      );

      const tracks = Array.isArray(detailData?.tracks) ? detailData.tracks : [];
      for (const track of tracks) {
        if (track?.id) {
          detailedTracks.set(track.id, track);
        }
      }
    } catch (error) {
      // Some Spotify app modes block the batch /tracks endpoint.
      // Fallback to single-track lookups so export can still complete.
      for (const trackId of chunk) {
        try {
          const track = await spotifyJson(`https://api.spotify.com/v1/tracks/${trackId}`, token);
          if (track?.id) {
            detailedTracks.set(track.id, track);
          }
        } catch {
          // Keep going; missing one track should not fail entire catalog export.
        }
      }
    }
  }

  return detailedTracks;
}

async function collectArtistCatalog(artistId: string, token: string): Promise<CollectedCatalog> {
  const artistData = await spotifyJson(`https://api.spotify.com/v1/artists/${artistId}`, token);
  if (!artistData?.name) {
    throw new SpotifyExportError("Could not resolve artist.", 404);
  }

  const albums = await fetchAllAlbums(artistId, token);
  const tracks = new Map<string, CandidateTrack>();

  for (const album of albums) {
    const albumTracks = await fetchAlbumTracks(album, token);
    for (const track of albumTracks) {
      if (!isMainOrFeatured(track.artists, artistId)) {
        continue;
      }
      const existing = tracks.get(track.id);
      if (!existing || track.album.release_date > existing.album.release_date) {
        tracks.set(track.id, track);
      }
    }
  }

  return {
    sourceType: "artist" as SpotifySourceType,
    sourceId: artistId,
    sourceName: String(artistData.name),
    artistId,
    artistName: String(artistData.name),
    tracks: Array.from(tracks.values()),
  };
}

async function collectPlaylistCatalog(playlistId: string, token: string): Promise<CollectedCatalog> {
  const playlistData = await spotifyJson(
    `https://api.spotify.com/v1/playlists/${playlistId}?${new URLSearchParams({
      fields: "id,name",
    }).toString()}`,
    token
  );

  if (!playlistData?.name) {
    throw new SpotifyExportError("Could not resolve playlist.", 404);
  }

  const tracks = await fetchPlaylistTracks(playlistId, token);
  return {
    sourceType: "playlist" as SpotifySourceType,
    sourceId: playlistId,
    sourceName: String(playlistData.name),
    tracks,
  };
}

export async function exportSpotifyCatalogCsv(token: string, artistInput: string): Promise<ExportedCatalog> {
  const parsedInput = parseSpotifyInput(artistInput);
  if (parsedInput.type === "track") {
    throw new SpotifyExportError("Please enter a Spotify Artist URL, raw artist ID, or playlist URL. Track links are not supported in this workflow.", 400);
  }

  const collected = parsedInput.type === "playlist"
    ? await collectPlaylistCatalog(parsedInput.id, token)
    : await collectArtistCatalog(parsedInput.id, token);

  const trackIds = collected.tracks.map((track) => track.id).filter(Boolean);
  if (trackIds.length === 0) {
    throw new SpotifyExportError(
      collected.sourceType === "playlist"
        ? "No Spotify tracks were found in that playlist."
        : "No Spotify tracks were found for that artist.",
      404
    );
  }

  const detailedTracks = await fetchTrackDetails(trackIds, token);

  const rowsByIsrc = new Map<string, CatalogRow>();
  const missingIsrcRows: CatalogRow[] = [];
  let tracksWithIsrc = 0;

  for (const searchTrack of collected.tracks) {
    const trackId = searchTrack.id;
    const detailTrack = detailedTracks.get(trackId);
    const isrc = normalizeIsrc(detailTrack?.external_ids?.isrc || "");
    const row: CatalogRow = {
      isrc,
      track_name: searchTrack.name,
      artist_names: Array.isArray(searchTrack.artists)
        ? searchTrack.artists.map((artist) => artist.name).join(", ")
        : "",
      album_name: searchTrack.album?.name || "",
      release_date: searchTrack.album?.release_date || "",
      spotify_track_id: trackId,
      spotify_album_id: searchTrack.album?.id || "",
      duration_ms: Number(detailTrack?.duration_ms || searchTrack.duration_ms || 0),
      explicit: Boolean(detailTrack?.explicit ?? searchTrack.explicit),
    };

    if (!isrc) {
      missingIsrcRows.push(row);
      continue;
    }

    tracksWithIsrc += 1;

    const current = rowsByIsrc.get(isrc);
    if (!current || row.release_date > current.release_date) {
      rowsByIsrc.set(isrc, row);
    }
  }

  const rows = sortNewestFirst(Array.from(rowsByIsrc.values()));
  const header = [
    "isrc",
    "track_name",
    "artist_names",
    "album_name",
    "release_date",
    "spotify_track_id",
    "spotify_album_id",
    "duration_ms",
    "explicit",
  ];

  const csv = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.isrc,
        row.track_name,
        row.artist_names,
        row.album_name,
        row.release_date,
        row.spotify_track_id,
        row.spotify_album_id,
        row.duration_ms,
        row.explicit,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ].join("\n");

  return {
    sourceType: collected.sourceType,
    sourceId: collected.sourceId,
    sourceName: collected.sourceName,
    catalogName: collected.sourceName,
    artistId: collected.artistId,
    artistName: collected.artistName,
    uniqueIsrcs: rows.length,
    tracksFound: collected.tracks.length,
    tracksWithIsrc,
    tracksMissingIsrc: missingIsrcRows.length,
    csv,
    previewRows: rows.slice(0, 8).map(toPreviewRow),
    missingIsrcPreview: missingIsrcRows
      .sort((left, right) => right.release_date.localeCompare(left.release_date))
      .slice(0, 8)
      .map(toPreviewRow),
  };
}
