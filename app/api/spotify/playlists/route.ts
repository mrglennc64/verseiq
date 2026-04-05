import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const artistName = req.nextUrl.searchParams.get("artist");
  const accessToken = req.nextUrl.searchParams.get("token");

  if (!artistName || !accessToken) {
    return NextResponse.json({ error: "Missing artist or token" }, { status: 400 });
  }

  const searchParams = new URLSearchParams({
    q: artistName,
    type: "playlist",
    limit: "10",
  });

  const resSpotify = await fetch(`https://api.spotify.com/v1/search?${searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resSpotify.ok) {
    const text = await resSpotify.text();
    console.error("Spotify playlists error:", text);
    return NextResponse.json({ error: "Spotify playlist fetch failed" }, { status: 500 });
  }

  const data = await resSpotify.json();
  return NextResponse.json(data);
}