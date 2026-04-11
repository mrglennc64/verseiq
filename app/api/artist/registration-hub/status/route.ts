import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getArtistRegistrationStatus } from "@/lib/registration/status";

// GET /api/artist/registration-hub/status?artistId=<id>
//
// Returns the artist's registration state across all tracked orgs, plus a
// rolled-up overall status for the top-of-hub badge.
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  if (!artistId) {
    return NextResponse.json({ error: "artistId query parameter is required" }, { status: 400 });
  }

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  const registration = await getArtistRegistrationStatus(artistId);

  return NextResponse.json({
    artist: {
      id: artist.id,
      legalName: artist.legalName,
      stageName: artist.stageName,
      email: artist.email,
    },
    soundexchange: registration.byOrg.SOUNDEXCHANGE,
    mlc: registration.byOrg.MLC,
    byOrg: registration.byOrg,
    overall: registration.overall,
    list: registration.list,
  });
}
