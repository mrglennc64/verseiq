import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const refreshToken = req.nextUrl.searchParams.get("refresh_token");

  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Spotify server credentials not configured" }, { status: 500 });
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Spotify refresh token error:", text);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }

  const tokenData = await tokenRes.json();
  return NextResponse.json(tokenData);
}
