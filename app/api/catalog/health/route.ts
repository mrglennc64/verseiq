import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import { computeCatalogHealth } from "@/lib/catalogHealth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const tenantId = getCurrentTenantId();

    const artists = await prisma.artist.findMany({
      where: { tenantId },
      orderBy: { legalName: "asc" },
      include: {
        recordings: {
          orderBy: { createdAt: "asc" },
          include: { splits: true },
        },
      },
    });

    const report = computeCatalogHealth(
      artists.map((a) => ({
        id: a.id,
        legalName: a.legalName,
        stageName: a.stageName,
        address: a.address,
        email: a.email,
        soundexchangeId: a.soundexchangeId,
        recordings: a.recordings.map((r) => ({
          id: r.id,
          isrc: r.isrc,
          title: r.title,
          label: r.label,
          upc: r.upc,
          releaseDate: r.releaseDate,
          splits: r.splits.map((s) => ({
            participantName: s.participantName,
            role: s.role,
            percentage: s.percentage,
          })),
        })),
      }))
    );

    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to compute catalog health" },
      { status: 500 }
    );
  }
}
