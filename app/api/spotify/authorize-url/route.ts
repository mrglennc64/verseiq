import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? "https://useverseiq.com/callback";

  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Missing SPOTIFY_CLIENT_ID" },
      { status: 500 }
    );
  }

  const authorizeUrl =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "",
      show_dialog: "false",
    }).toString();

  return NextResponse.json({ ok: true, authorizeUrl });
}
