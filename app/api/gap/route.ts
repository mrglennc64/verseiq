import { NextRequest, NextResponse } from "next/server";
import { computeGapReport } from "../../../lib/computeGapReport";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const soundexchangeFile = form.get("soundexchange_csv");
    const spotifyFile = form.get("spotify_csv");

    if (!(soundexchangeFile instanceof File) || !(spotifyFile instanceof File)) {
      return NextResponse.json(
        { error: "Both soundexchange_csv and spotify_csv files are required." },
        { status: 400 }
      );
    }

    const [soundexchangeBuffer, spotifyBuffer] = await Promise.all([
      soundexchangeFile.arrayBuffer(),
      spotifyFile.arrayBuffer(),
    ]);

    const report = computeGapReport(
      Buffer.from(soundexchangeBuffer),
      Buffer.from(spotifyBuffer)
    );

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute gap report", details: String(error) },
      { status: 500 }
    );
  }
}
