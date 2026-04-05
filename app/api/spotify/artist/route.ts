import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("id");
  const accessToken = req.nextUrl.searchParams.get("token");

  if (!artistId || !accessToken) {
    return NextResponse.json({ error: "Missing id or token" }, { status: 400 });
  }

  const resSpotify = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resSpotify.ok) {
    const text = await resSpotify.text();
    console.error("Spotify artist error:", text);
    return NextResponse.json({ error: "Spotify artist fetch failed" }, { status: 500 });
  }

  const data = await resSpotify.json();
  return NextResponse.json(data);
}