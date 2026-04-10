import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDefaultTenant, getCurrentTenantId } from "@/lib/tenant";

export const runtime = "nodejs";

type CreateBody = {
  legalName?: string;
  stageName?: string;
  address?: string;
  email?: string;
  soundexchangeId?: string;
  mlcId?: string;
  proAffiliation?: string;
};

export async function GET() {
  try {
    const tenantId = getCurrentTenantId();
    const artists = await prisma.artist.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { recordings: true } },
      },
    });
    return NextResponse.json({ artists });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to list artists" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateBody;

    const legalName = body.legalName?.trim();
    if (!legalName) {
      return NextResponse.json({ error: "legalName is required" }, { status: 400 });
    }

    await ensureDefaultTenant();
    const tenantId = getCurrentTenantId();

    const artist = await prisma.artist.create({
      data: {
        tenantId,
        legalName,
        stageName: body.stageName?.trim() || null,
        address: body.address?.trim() || null,
        email: body.email?.trim() || null,
        soundexchangeId: body.soundexchangeId?.trim() || null,
        mlcId: body.mlcId?.trim() || null,
        proAffiliation: body.proAffiliation?.trim() || null,
      },
    });

    return NextResponse.json({ artist });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create artist" },
      { status: 500 }
    );
  }
}
