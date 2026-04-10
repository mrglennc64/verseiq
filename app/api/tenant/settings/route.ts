import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDefaultTenant, getCurrentTenantId } from "@/lib/tenant";

export const runtime = "nodejs";

type PutBody = {
  defaultRepName?: string | null;
  defaultRepEntity?: string | null;
  defaultFeePercent?: number | null;
};

export async function GET() {
  try {
    const tenantId = getCurrentTenantId();
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to load tenant settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PutBody;

    let feePercent: number | null | undefined;
    if (body.defaultFeePercent === null || body.defaultFeePercent === undefined) {
      feePercent = body.defaultFeePercent ?? undefined;
    } else {
      const n = Number(body.defaultFeePercent);
      if (!Number.isFinite(n) || n < 0 || n > 50) {
        return NextResponse.json(
          { error: "defaultFeePercent must be between 0 and 50" },
          { status: 400 }
        );
      }
      feePercent = n;
    }

    await ensureDefaultTenant();
    const tenantId = getCurrentTenantId();

    const repName = body.defaultRepName?.trim() || null;
    const repEntity = body.defaultRepEntity?.trim() || null;

    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId },
      update: {
        defaultRepName: repName,
        defaultRepEntity: repEntity,
        defaultFeePercent: feePercent ?? null,
      },
      create: {
        tenantId,
        defaultRepName: repName,
        defaultRepEntity: repEntity,
        defaultFeePercent: feePercent ?? null,
      },
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to save tenant settings" },
      { status: 500 }
    );
  }
}
