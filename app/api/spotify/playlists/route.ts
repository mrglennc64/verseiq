import { NextRequest, NextResponse } from "next/server";

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

  // Followers are NOT available in search results
  const normalized = items
    .filter((p: any) => p && p.id)
    .map((p: any) => ({
    id: p.id,
    name: p.name ?? "",
    followers: 0,
    description: p.description ?? "",
    ownerName: p.owner?.display_name ?? "",
    ownerType: p.owner?.type ?? "",
    isEditorial: p.owner?.id === "spotify",
  }));

  return NextResponse.json({ playlists: normalized });
}