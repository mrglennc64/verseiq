import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  REGISTRATION_ORGS,
  calculateOverall,
  type RegistrationOrg,
  type RegistrationStatusCode,
} from "@/lib/registration/status";

// Force dynamic — this route reads the live DB on every request.
// Without this, Next 14 prerenders the handler at build time with empty results.
export const dynamic = "force-dynamic";

// GET /api/admin/registration/list
//
// Returns every artist with their current registration status for each org,
// plus the rolled-up overall status. One row per artist.
export async function GET() {
  const artists = await prisma.artist.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      registrationStatuses: true,
    },
  });

  const rows = artists.map((a) => {
    const byOrg: Partial<Record<RegistrationOrg, RegistrationStatusCode>> = {};
    let latestUpdate = a.createdAt;

    for (const rs of a.registrationStatuses) {
      if ((REGISTRATION_ORGS as readonly string[]).includes(rs.org)) {
        byOrg[rs.org as RegistrationOrg] = rs.status as RegistrationStatusCode;
      }
      if (rs.updatedAt > latestUpdate) latestUpdate = rs.updatedAt;
    }

    return {
      artistId: a.id,
      artistName: a.stageName || a.legalName,
      legalName: a.legalName,
      email: a.email,
      soundexchange: byOrg.SOUNDEXCHANGE ?? "NOT_STARTED",
      mlc: byOrg.MLC ?? "NOT_STARTED",
      byOrg,
      overall: calculateOverall(byOrg),
      lastUpdate: latestUpdate.toISOString(),
    };
  });

  return NextResponse.json({ rows });
}
