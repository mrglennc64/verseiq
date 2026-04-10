import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDefaultTenant, getCurrentTenantId } from "@/lib/tenant";

export const runtime = "nodejs";

type CreateBody = {
  recordingId?: string;
  participantName?: string;
  role?: string;
  percentage?: number;
};

export async function GET(req: NextRequest) {
  try {
    const tenantId = getCurrentTenantId();
    const url = new URL(req.url);
    const recordingId = url.searchParams.get("recordingId") ?? undefined;

    const splits = await prisma.split.findMany({
      where: {
        tenantId,
        ...(recordingId ? { recordingId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ splits });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to list splits" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateBody;

    const recordingId = body.recordingId?.trim();
    const participantName = body.participantName?.trim();
    const role = body.role?.trim();
    const percentage = Number(body.percentage);

    if (!recordingId)
      return NextResponse.json({ error: "recordingId is required" }, { status: 400 });
    if (!participantName)
      return NextResponse.json({ error: "participantName is required" }, { status: 400 });
    if (!role) return NextResponse.json({ error: "role is required" }, { status: 400 });
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      return NextResponse.json(
        { error: "percentage must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    await ensureDefaultTenant();
    const tenantId = getCurrentTenantId();

    const recording = await prisma.recording.findFirst({
      where: { id: recordingId, tenantId },
    });
    if (!recording) {
      return NextResponse.json({ error: "recordingId does not exist" }, { status: 404 });
    }

    const existing = await prisma.split.findMany({
      where: { tenantId, recordingId },
    });
    const total = existing.reduce((sum, s) => sum + s.percentage, 0) + percentage;
    if (total > 100.0001) {
      return NextResponse.json(
        {
          error: `Adding ${percentage}% would exceed 100% (existing splits already total ${existing.reduce((s, x) => s + x.percentage, 0)}%)`,
        },
        { status: 400 }
      );
    }

    const split = await prisma.split.create({
      data: {
        tenantId,
        recordingId,
        participantName,
        role,
        percentage,
      },
    });

    return NextResponse.json({ split });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create split" },
      { status: 500 }
    );
  }
}
