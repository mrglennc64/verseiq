import { getSpotifyToken } from "./spotifyAuth";

const SPOTIFY_API = "https://api.spotify.com/v1";
const DEBUG = process.env.SPOTIFY_DEBUG === "true";

type SpotifyPage<T> = {
  items: T[];
  next: string | null;
  total?: number;
};

async function spotifyGetWithLimitFallback(path: string, offset = 0) {
  const limits = [50, 20, 10, 5, 1];
  let lastErr: Error | null = null;

  for (const limit of limits) {
    try {
      return await spotifyGet(path, { limit: String(limit), offset: String(offset) });
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();
      if (message.includes("invalid limit")) {
        lastErr = error;
        continue;
      }
      throw error;
    }
  }

  throw lastErr ?? new Error("Spotify request failed for all fallback limits");
}

async function spotifyGet(path: string, params?: Record<string, string>) {
  const token = await getSpotifyToken();
  const url = new URL(path.startsWith("http") ? path : SPOTIFY_API + path);

  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  if (DEBUG) {
    console.log("[SPOTIFY GET]", url.toString());
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = new Error(`Spotify GET ${url.pathname} failed: ${res.status} ${await res.text()}`) as any;
    if (res.status === 429) {
      err.retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
    }
    throw err;
  }

  return res.json();
}

export async function getArtist(artistId: string) {
  return spotifyGet(`/artists/${artistId}`);
}

export async function getArtistAlbumsPage(artistId: string, offset = 0, limit = 50) {
  return spotifyGet(`/artists/${artistId}/albums`, {
    include_groups: "album,single,appears_on,compilation",
    limit: String(limit),
    offset: String(offset),
  });
}

export async function getArtistAlbumsAll(artistId: string) {
  const albums: any[] = [];
  let offset = 0;
  let acceptedLimit = 50;

  while (true) {
    const page = (await spotifyGetWithLimitFallback(
      `/artists/${artistId}/albums?include_groups=album,single,appears_on,compilation`,
      offset
    )) as SpotifyPage<any> & { limit?: number };
    albums.push(...(page.items || []));
    if (typeof page.limit === "number" && page.limit > 0) {
      acceptedLimit = page.limit;
    }

    if (!page.next || (page.items || []).length === 0) {
      break;
    }

    offset += acceptedLimit;
  }

  return albums;
}

export async function getAlbumTracksPage(albumId: string, offset = 0, limit = 50) {
  return spotifyGet(`/albums/${albumId}/tracks`, {
    limit: String(limit),
    offset: String(offset),
  });
}

export async function getAlbumTracksAll(albumId: string) {
  const tracks: any[] = [];
  let offset = 0;
  let acceptedLimit = 50;

  while (true) {
    const page = (await spotifyGetWithLimitFallback(`/albums/${albumId}/tracks`, offset)) as SpotifyPage<any> & {
      limit?: number;
    };
    tracks.push(...(page.items || []));
    if (typeof page.limit === "number" && page.limit > 0) {
      acceptedLimit = page.limit;
    }

    if (!page.next || (page.items || []).length === 0) {
      break;
    }

    offset += acceptedLimit;
  }

  return tracks;
}

export async function getTrack(trackId: string) {
  return spotifyGet(`/tracks/${trackId}`);
}

export async function getArtistAlbums(artistId: string) {
  const items = await getArtistAlbumsAll(artistId);
  return { items };
}

export async function getAlbumTracks(albumId: string) {
  const items = await getAlbumTracksAll(albumId);
  const ids = items.map((t: any) => t?.id).filter(Boolean);
  const fullTracks = await getTracksByIds(ids);
  const fullById = new Map(fullTracks.map((t: any) => [t.id, t]));

  return {
    items: items.map((t: any) => {
      const full = fullById.get(t.id);
      return {
        ...t,
        external_ids: full?.external_ids ?? t.external_ids,
      };
    }),
  };
}

export async function getTracksByIds(trackIds: string[]) {
  const out: any[] = [];

  for (let i = 0; i < trackIds.length; i += 50) {
    const chunk = trackIds.slice(i, i + 50);
    const ids = chunk.join(",");
    try {
      const data = await spotifyGet("/tracks", { ids });
      out.push(...(Array.isArray(data?.tracks) ? data.tracks : []));
    } catch (error: any) {
      // Some Spotify app modes can block /tracks details even when artist/albums are allowed.
      if (DEBUG) {
        console.warn("[SPOTIFY GET] /tracks enrichment skipped:", String(error?.message || error));
      }

      // Fallback: request each track individually when the batch endpoint is blocked.
      for (const trackId of chunk) {
        try {
          out.push(await getTrack(trackId));
        } catch (singleError: any) {
          if (DEBUG) {
            console.warn(
              "[SPOTIFY GET] /tracks/{id} enrichment skipped for",
              trackId,
              String(singleError?.message || singleError)
            );
          }
        }
      }
    }
  }

  return out;
}
