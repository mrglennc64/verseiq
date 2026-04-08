import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const scans = await prisma.royaltyScan.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    scans: scans.map((scan) => {
      const result = scan.resultJson as any;
      return {
        scanId: scan.id,
        artistId: scan.artistId,
        artistName: result?.artist?.name ?? null,
        status: scan.status,
        progress: scan.progress,
        message: scan.message,
        createdAt: scan.createdAt,
        updatedAt: scan.updatedAt,
      };
    }),
  });
}