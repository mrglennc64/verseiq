import { NextRequest, NextResponse } from "next/server";

async function fetchPlaylistDetails(playlistId: string, token: string) {
  const detailsRes = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?` +
      new URLSearchParams({
        fields: "id,name,description,owner(id,display_name,type),followers(total)",
      }),
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!detailsRes.ok) {
    const text = await detailsRes.text();
    console.error("Spotify error:", text);
    throw new Error(`Playlist details fetch failed for ${playlistId}`);
  }

  return detailsRes.json();
}

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist");
  const token = req.nextUrl.searchParams.get("token");

  if (!artist || !token) {
    return NextResponse.json({ error: "Missing artist or token" }, { status: 400 });
  }

  // Sanitize query
  const cleanArtist = artist.replace(/[^a-zA-Z0-9 äöåÄÖÅ]/g, " ").trim();

  const url =
    "https://api.spotify.com/v1/search?" +
    new URLSearchParams({
      q: cleanArtist,
      type: "playlist",
      limit: "10",
    });

  const resSpotify = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resSpotify.ok) {
    const text = await resSpotify.text();
    console.error("Spotify playlist error:", text);
    return NextResponse.json(
      { error: "Spotify playlist fetch failed", details: text },
      { status: 500 }
    );
  }

  const data = await resSpotify.json();
  const items = Array.isArray(data.playlists?.items) ? data.playlists.items : [];
  const candidates = items.filter((p: any) => p && p.id);

  const enriched = await Promise.allSettled(
    candidates.map(async (playlist: any) => {
      const details = await fetchPlaylistDetails(playlist.id, token);
      return {
        id: playlist.id,
        name: playlist.name ?? details?.name ?? "",
        followers: details?.followers?.total ?? 0,
        description: details?.description ?? playlist.description ?? "",
        ownerName: details?.owner?.display_name ?? playlist.owner?.display_name ?? "",
        ownerType: details?.owner?.type ?? playlist.owner?.type ?? "",
        isEditorial: (details?.owner?.id ?? playlist.owner?.id) === "spotify",
      };
    })
  );

  const normalized = enriched
    .filter((result): result is PromiseFulfilledResult<any> => result.status === "fulfilled")
    .map((result) => result.value);

  return NextResponse.json({ playlists: normalized });
}