import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

export const runtime = "nodejs";

/**
 * GET /api/statements/[id]
 * Returns the statement with all its lines. Matched lines include the linked
 * recording (+ artist name) so the UI can show the resolved track.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenantId = getCurrentTenantId();
    const statement = await prisma.statement.findFirst({
      where: { id: params.id, tenantId },
      include: {
        lines: {
          orderBy: [{ matched: "asc" }, { amount: "desc" }],
          include: {
            recording: {
              select: {
                id: true,
                isrc: true,
                title: true,
                artist: { select: { id: true, legalName: true, stageName: true } },
              },
            },
          },
        },
      },
    });

    if (!statement) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ statement });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to load statement" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/statements/[id]
 * Removes a statement and (via cascade) its lines.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenantId = getCurrentTenantId();
    const existing = await prisma.statement.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.statement.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to delete statement" },
      { status: 500 },
    );
  }
}
