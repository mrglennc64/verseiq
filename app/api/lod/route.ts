import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const lods = await prisma.lod.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        submissions: {
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    return NextResponse.json({ lods });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to list LODs" },
      { status: 500 }
    );
  }
}
