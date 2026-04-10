import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const VALID_PLATFORMS = new Set(["soundexchange", "mlc", "pro"]);

type ConfirmBody = {
  lodId?: string;
  platform?: string;
  packetPath?: string;
  note?: string;
  submittedAt?: string;
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform")?.toLowerCase() ?? undefined;
    const lodId = url.searchParams.get("lodId") ?? undefined;

    const submissions = await prisma.submission.findMany({
      where: {
        ...(platform && VALID_PLATFORMS.has(platform) ? { platform } : {}),
        ...(lodId ? { lodId } : {}),
      },
      orderBy: { submittedAt: "desc" },
      include: { lod: true },
    });

    return NextResponse.json({ submissions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to list submissions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ConfirmBody;

    const platform = body.platform?.toLowerCase().trim();
    if (!platform || !VALID_PLATFORMS.has(platform)) {
      return NextResponse.json(
        { error: "platform must be one of: soundexchange, mlc, pro" },
        { status: 400 }
      );
    }

    const packetPath = body.packetPath?.trim();
    if (!packetPath) {
      return NextResponse.json({ error: "packetPath is required" }, { status: 400 });
    }

    if (body.lodId) {
      const lod = await prisma.lod.findUnique({ where: { id: body.lodId } });
      if (!lod) {
        return NextResponse.json({ error: "lodId does not exist" }, { status: 404 });
      }
    }

    let submittedAt: Date | undefined;
    if (body.submittedAt) {
      const parsed = new Date(body.submittedAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "submittedAt must be a valid ISO date string" },
          { status: 400 }
        );
      }
      submittedAt = parsed;
    }

    const submission = await prisma.submission.create({
      data: {
        lodId: body.lodId ?? null,
        platform,
        packetPath,
        note: body.note?.trim() || null,
        ...(submittedAt ? { submittedAt } : {}),
      },
    });

    return NextResponse.json({ submission });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to record submission" },
      { status: 500 }
    );
  }
}
