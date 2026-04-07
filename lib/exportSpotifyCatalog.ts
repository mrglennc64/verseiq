function spotifyFetch(url: string, token: string) {
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export function extractArtistId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/artist\/([A-Za-z0-9]+)(?:\?|$)/);
  return match ? match[1] : trimmed;
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

type SearchTrack = {
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

export async function exportSpotifyCatalogCsv(token: string, artistInput: string) {
  const artistId = extractArtistId(artistInput);
  if (!artistId) {
    throw new Error("Missing Spotify artist ID.");
  }

  const artistRes = await spotifyFetch(`https://api.spotify.com/v1/artists/${artistId}`, token);
  const artistData = await artistRes.json().catch(() => ({}));
  if (!artistRes.ok || !artistData?.name) {
    throw new Error(artistData?.error?.message || artistData?.details || "Could not resolve artist.");
  }

  const artistName = String(artistData.name);
  const searchMatches = new Map<string, SearchTrack>();
  let offset = 0;
  const limit = 50;
  let keepFetching = true;

  while (keepFetching && offset < 1000) {
    const query = new URLSearchParams({
      q: `artist:\"${artistName}\"`,
      type: "track",
      limit: String(limit),
      offset: String(offset),
    });

    const searchRes = await spotifyFetch(`https://api.spotify.com/v1/search?${query.toString()}`, token);
    const searchData = await searchRes.json().catch(() => ({}));
    if (!searchRes.ok) {
      throw new Error(searchData?.error?.message || `Spotify search failed (${searchRes.status})`);
    }

    const items = Array.isArray(searchData?.tracks?.items) ? searchData.tracks.items : [];
    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const hasArtist = Array.isArray(item?.artists) && item.artists.some((artist: any) => artist?.id === artistId);
      if (hasArtist && item?.id && item?.name && item?.album?.id) {
        searchMatches.set(item.id, item as SearchTrack);
      }
    }

    offset += limit;
    keepFetching = Boolean(searchData?.tracks?.next);
  }

  const trackIds = Array.from(searchMatches.keys());
  const detailedTracks = new Map<string, any>();

  for (let index = 0; index < trackIds.length; index += 50) {
    const chunk = trackIds.slice(index, index + 50);
    const detailRes = await spotifyFetch(
      `https://api.spotify.com/v1/tracks?${new URLSearchParams({ ids: chunk.join(",") }).toString()}`,
      token
    );
    const detailData = await detailRes.json().catch(() => ({}));
    if (!detailRes.ok) {
      throw new Error(detailData?.error?.message || `Spotify track lookup failed (${detailRes.status})`);
    }

    const tracks = Array.isArray(detailData?.tracks) ? detailData.tracks : [];
    tracks.forEach((track: any) => {
      if (track?.id) {
        detailedTracks.set(track.id, track);
      }
    });
  }

  const rowsByIsrc = new Map<string, CatalogRow>();
  for (const [trackId, searchTrack] of Array.from(searchMatches.entries())) {
    const detailTrack = detailedTracks.get(trackId);
    const isrc = normalizeIsrc(detailTrack?.external_ids?.isrc || "");
    if (!isrc) {
      continue;
    }

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
    artistId,
    artistName,
    uniqueIsrcs: rows.length,
    csv,
  };
}
