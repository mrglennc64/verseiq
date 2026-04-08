import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const artistId = String(body?.artistId ?? "").trim();

    if (!artistId) {
      return NextResponse.json({ error: "artistId is required" }, { status: 400 });
    }

    const scan = await prisma.royaltyScan.create({
      data: {
        artistId,
        status: "pending",
        progress: 0,
        message: "Queued for processing",
      },
    });

    return NextResponse.json({
      scanId: scan.id,
      status: scan.status,
      progress: scan.progress,
      message: scan.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to start scan" },
      { status: 500 }
    );
  }
}