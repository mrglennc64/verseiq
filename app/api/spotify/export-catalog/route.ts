import { NextRequest, NextResponse } from "next/server";
import { exportSpotifyCatalogCsv, SpotifyExportError } from "../../../../lib/exportSpotifyCatalog";
import { getSpotifyToken } from "../../../../lib/spotifyAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const artist = req.nextUrl.searchParams.get("input") || req.nextUrl.searchParams.get("artist") || "";
    const tokenFromQuery = req.nextUrl.searchParams.get("token") || "";

    if (!artist) {
      return NextResponse.json(
        { error: "input is required" },
        { status: 400 }
      );
    }

    const token = tokenFromQuery || (await getSpotifyToken());
    const result = await exportSpotifyCatalogCsv(token, artist);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SpotifyExportError) {
      return NextResponse.json(
        { error: error.message, details: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to export Spotify catalog", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
