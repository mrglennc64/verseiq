import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const token = req.nextUrl.searchParams.get("token");

  if (!query || !token) {
    return NextResponse.json({ error: "Missing q or token" }, { status: 400 });
  }

  const resSpotify = await fetch(
    "https://api.spotify.com/v1/search?" +
      new URLSearchParams({
        q: query,
        type: "artist",
        limit: "10",
      }),
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!resSpotify.ok) {
    const text = await resSpotify.text();
    console.error("Spotify error:", text);
    return NextResponse.json({ error: "Spotify artist search failed", details: text }, { status: 500 });
  }

  const data = await resSpotify.json();
  const artists = Array.isArray(data?.artists?.items)
    ? data.artists.items
        .filter((artist: any) => artist?.id)
        .map((artist: any) => ({
          id: artist.id,
          name: artist.name ?? "",
          followers: artist?.followers?.total ?? 0,
          popularity: artist?.popularity ?? 0,
        }))
    : [];

  return NextResponse.json({ artists });
}
