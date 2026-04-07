import { NextResponse } from "next/server";
import { getSpotifyToken } from "../../../../lib/spotifyAuth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSpotifyToken();
    return NextResponse.json({ ok: true, tokenPresent: !!token });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
