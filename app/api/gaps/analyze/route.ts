import { NextRequest, NextResponse } from "next/server";
import { analyzeRoyaltyGapsAction } from "@/app/actions/royaltyRecoveryWorkflow";

/**
 * API Route: POST /api/gaps/analyze
 * --------------------------------
 * Analyze gaps between Spotify catalog and SoundExchange registrations.
 * 
 * Request body:
 * {
 *   "spotifyInput": "https://open.spotify.com/artist/..." or artifact/ID",
 *   "soundexchangeCsv": "CSV text content"
 * }
 * 
 * Response:
 * {
 *   "status": "success|error",
 *   "data": GapAnalysisResult | null,
 *   "error": string | null
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { spotifyInput, soundexchangeCsv } = await request.json();

    if (!spotifyInput) {
      return NextResponse.json(
        { status: "error", error: "Missing spotifyInput" },
        { status: 400 }
      );
    }

    if (!soundexchangeCsv) {
      return NextResponse.json(
        { status: "error", error: "Missing soundexchangeCsv" },
        { status: 400 }
      );
    }

    const result = await analyzeRoyaltyGapsAction(spotifyInput, soundexchangeCsv);

    return NextResponse.json({
      status: "success",
      data: result,
      error: null,
    });
  } catch (error: any) {
    console.error("[API /gaps/analyze] Error:", error);

    return NextResponse.json(
      {
        status: "error",
        data: null,
        error: error.message || "Failed to analyze gaps",
      },
      { status: 400 }
    );
  }
}
