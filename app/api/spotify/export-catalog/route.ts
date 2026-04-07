import { NextRequest, NextResponse } from "next/server";
import { exportSpotifyCatalogCsv } from "../../../../lib/exportSpotifyCatalog";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const artist = req.nextUrl.searchParams.get("artist") || "";
    const token = req.nextUrl.searchParams.get("token") || "";

    if (!artist || !token) {
      return NextResponse.json(
        { error: "artist and token are required" },
        { status: 400 }
      );
    }

    const result = await exportSpotifyCatalogCsv(token, artist);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to export Spotify catalog", details: String(error) },
      { status: 500 }
    );
  }
}
