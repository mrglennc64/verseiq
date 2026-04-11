import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidOrg } from "@/lib/registration/status";

// POST /api/admin/registration/remind
// Body: { artistId, org, note? }
//
// Records a reminder in ReminderLog. Actual email delivery is intentionally
// stubbed — this endpoint captures intent so the admin UI can show "last
// reminder sent at ...". When transactional email is wired up, send from here.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { artistId, org, note } = body as {
    artistId?: string;
    org?: string;
    note?: string | null;
  };

  if (!artistId || typeof artistId !== "string") {
    return NextResponse.json({ error: "artistId is required" }, { status: 400 });
  }
  if (!org || !isValidOrg(org)) {
    return NextResponse.json({ error: "org must be one of the supported orgs" }, { status: 400 });
  }

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  const reminder = await prisma.reminderLog.create({
    data: {
      artistId,
      org,
      channel: "email",
      note: note ?? null,
      sentBy: "admin",
    },
  });

  // TODO: when transactional email is wired up (Resend/Postmark), trigger send here.
  // For now we only record intent.

  return NextResponse.json({
    ok: true,
    sent: true,
    reminderId: reminder.id,
    sentAt: reminder.sentAt.toISOString(),
  });
}
