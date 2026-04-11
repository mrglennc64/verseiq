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

  // Catalog data for the hub dashboard — cheap enough to inline here rather
  // than carving out a second endpoint. We cap the preview list at 10 rows.
  const [recordingCount, recordings] = await Promise.all([
    prisma.recording.count({ where: { artistId } }),
    prisma.recording.findMany({
      where: { artistId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, isrc: true, title: true, upc: true },
    }),
  ]);

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
    catalog: {
      recordingCount,
      preview: recordings.map((r) => ({
        id: r.id,
        title: r.title,
        isrc: r.isrc,
        missingUpc: !r.upc,
      })),
    },
  });
}
