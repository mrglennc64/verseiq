import type { RoyaltyTrack } from "./types";

type AlternativeCatalog = {
  artist: { id: string; name: string };
  tracks: RoyaltyTrack[];
  providerStats: {
    deezerTracks: number;
    musicbrainzTracks: number;
    discogsTracks: number;
  };
};

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDeezerTracks(artistName: string): Promise<RoyaltyTrack[]> {
  const search = await fetchJson(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}`
  );
  const artist = search?.data?.[0];
  if (!artist?.id) return [];

  const top = await fetchJson(`https://api.deezer.com/artist/${artist.id}/top?limit=20`);
  const tracks = Array.isArray(top?.data) ? top.data : [];
  const out: RoyaltyTrack[] = [];

  // Deezer top tracks often have null ISRC; hydrate through track detail endpoint.
  for (const t of tracks) {
    if (!t?.id) continue;
    let full = t;
    try {
      full = await fetchJson(`https://api.deezer.com/track/${t.id}`);
    } catch {
      // Keep partial data if detail fetch fails.
    }

    out.push({
      track_id: String(full.id),
      track_name: String(full.title ?? "Unknown Track"),
      isrc: full.isrc ? String(full.isrc) : null,
      album_id: String(full.album?.id ?? `deezer_album_${full.id}`),
      album_name: String(full.album?.title ?? "Unknown Album"),
      release_date: full.release_date ? String(full.release_date) : null,
      popularity: typeof full.rank === "number" ? Math.min(100, Math.round(full.rank / 10000)) : undefined,
      distributor: "deezer",
      registered: null,
    });
  }

  return out;
}

async function fetchMusicBrainzTracks(artistName: string): Promise<RoyaltyTrack[]> {
  const headers = { "User-Agent": "VerseIQ/1.0 (contact@useverseiq.com)" };
  const data = await fetchJson(
    `https://musicbrainz.org/ws/2/recording?query=artist:${encodeURIComponent(artistName)}&fmt=json&limit=20`,
    { headers },
    12000
  );

  const recordings = Array.isArray(data?.recordings) ? data.recordings : [];
  const out: RoyaltyTrack[] = [];

  for (const r of recordings) {
    const release = Array.isArray(r.releases) ? r.releases[0] : null;
    out.push({
      track_id: String(r.id ?? `mb_${Math.random()}`),
      track_name: String(r.title ?? "Unknown Track"),
      isrc: null,
      album_id: String(release?.id ?? `mb_album_${r.id}`),
      album_name: String(release?.title ?? "Unknown Album"),
      release_date: r["first-release-date"] ? String(r["first-release-date"]) : null,
      distributor: "musicbrainz",
      registered: null,
    });
  }

  return out;
}

async function fetchDiscogsTracks(artistName: string): Promise<RoyaltyTrack[]> {
  const token = process.env.DISCOGS_TOKEN;
  const headers: Record<string, string> = {
    "User-Agent": "VerseIQ/1.0",
  };
  if (token) {
    headers.Authorization = `Discogs token=${token}`;
  }

  try {
    const data = await fetchJson(
      `https://api.discogs.com/database/search?artist=${encodeURIComponent(artistName)}&type=release&per_page=15`,
      { headers },
      12000
    );

    const results = Array.isArray(data?.results) ? data.results : [];
    const out: RoyaltyTrack[] = [];
    for (const item of results) {
      const title = String(item.title ?? "Unknown Release");
      out.push({
        track_id: String(item.id ?? `discogs_${Math.random()}`),
        track_name: title,
        isrc: null,
        album_id: String(item.master_id ?? item.id ?? `discogs_album_${Math.random()}`),
        album_name: title,
        release_date: item.year ? String(item.year) : null,
        distributor: "discogs",
        registered: null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function buildAlternativeCatalog(artistName: string): Promise<AlternativeCatalog> {
  const [deezer, musicbrainz, discogs] = await Promise.all([
    fetchDeezerTracks(artistName).catch(() => []),
    fetchMusicBrainzTracks(artistName).catch(() => []),
    fetchDiscogsTracks(artistName).catch(() => []),
  ]);

  const combined = [...deezer, ...musicbrainz, ...discogs];
  const dedup = new Map<string, RoyaltyTrack>();

  for (const track of combined) {
    const key = track.isrc ? `isrc:${track.isrc}` : `title:${normalizeTitle(track.track_name)}`;
    const existing = dedup.get(key);
    if (!existing) {
      dedup.set(key, track);
      continue;
    }

    // Prefer entries with ISRC and better release dates.
    if (!existing.isrc && track.isrc) {
      dedup.set(key, track);
      continue;
    }
    if ((track.release_date ?? "") > (existing.release_date ?? "")) {
      dedup.set(key, track);
    }
  }

  return {
    artist: { id: `alt:${normalizeTitle(artistName)}`, name: artistName },
    tracks: Array.from(dedup.values()),
    providerStats: {
      deezerTracks: deezer.length,
      musicbrainzTracks: musicbrainz.length,
      discogsTracks: discogs.length,
    },
  };
}
