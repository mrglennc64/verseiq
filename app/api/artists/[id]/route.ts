import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

export const runtime = "nodejs";

type PatchBody = {
  legalName?: string;
  stageName?: string | null;
  address?: string | null;
  email?: string | null;
  soundexchangeId?: string | null;
  mlcId?: string | null;
  proAffiliation?: string | null;
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tenantId = getCurrentTenantId();
    const body = (await req.json().catch(() => ({}))) as PatchBody;

    const existing = await prisma.artist.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.legalName !== undefined) {
      const v = body.legalName?.trim();
      if (!v) {
        return NextResponse.json({ error: "legalName cannot be empty" }, { status: 400 });
      }
      data.legalName = v;
    }
    if (body.stageName !== undefined) data.stageName = body.stageName?.trim() || null;
    if (body.address !== undefined) data.address = body.address?.trim() || null;
    if (body.email !== undefined) data.email = body.email?.trim() || null;
    if (body.soundexchangeId !== undefined)
      data.soundexchangeId = body.soundexchangeId?.trim() || null;
    if (body.mlcId !== undefined) data.mlcId = body.mlcId?.trim() || null;
    if (body.proAffiliation !== undefined)
      data.proAffiliation = body.proAffiliation?.trim() || null;

    const artist = await prisma.artist.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ artist });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update artist" },
      { status: 500 }
    );
  }
}
