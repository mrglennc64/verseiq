import { NextRequest, NextResponse } from "next/server";
import {
  isValidOrg,
  isValidStatus,
  setArtistRegistrationStatus,
} from "@/lib/registration/status";

// POST /api/admin/registration/update
// Body: { artistId, org, status, note? }
//
// Upserts the (artistId, org) row. Used by the admin dashboard to mark
// submissions verified, packets generated, etc.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { artistId, org, status, note } = body as {
    artistId?: string;
    org?: string;
    status?: string;
    note?: string | null;
  };

  if (!artistId || typeof artistId !== "string") {
    return NextResponse.json({ error: "artistId is required" }, { status: 400 });
  }
  if (!org || !isValidOrg(org)) {
    return NextResponse.json({ error: "org must be one of the supported orgs" }, { status: 400 });
  }
  if (!status || !isValidStatus(status)) {
    return NextResponse.json({ error: "status is not a valid registration status code" }, { status: 400 });
  }

  const row = await setArtistRegistrationStatus({
    artistId,
    org,
    status,
    note: note ?? null,
    updatedBy: "admin",
  });

  return NextResponse.json({
    ok: true,
    row: {
      artistId: row.artistId,
      org: row.org,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
