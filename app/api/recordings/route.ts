import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDefaultTenant, getCurrentTenantId } from "@/lib/tenant";

export const runtime = "nodejs";

const ISRC_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

type CreateBody = {
  artistId?: string;
  isrc?: string;
  title?: string;
  releaseDate?: string;
  label?: string;
  upc?: string;
};

export async function GET(req: NextRequest) {
  try {
    const tenantId = getCurrentTenantId();
    const url = new URL(req.url);
    const artistId = url.searchParams.get("artistId") ?? undefined;

    const recordings = await prisma.recording.findMany({
      where: {
        tenantId,
        ...(artistId ? { artistId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        artist: { select: { id: true, legalName: true, stageName: true } },
        splits: true,
      },
    });

    return NextResponse.json({ recordings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to list recordings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateBody;

    const artistId = body.artistId?.trim();
    const isrc = body.isrc?.trim().toUpperCase();
    const title = body.title?.trim();

    if (!artistId) return NextResponse.json({ error: "artistId is required" }, { status: 400 });
    if (!isrc) return NextResponse.json({ error: "isrc is required" }, { status: 400 });
    if (!ISRC_PATTERN.test(isrc)) {
      return NextResponse.json(
        { error: "isrc must match the format CCXXXYYNNNNN (e.g. USRC12345678)" },
        { status: 400 }
      );
    }
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    await ensureDefaultTenant();
    const tenantId = getCurrentTenantId();

    const artist = await prisma.artist.findFirst({
      where: { id: artistId, tenantId },
    });
    if (!artist) {
      return NextResponse.json({ error: "artistId does not exist" }, { status: 404 });
    }

    let releaseDate: Date | null = null;
    if (body.releaseDate) {
      const parsed = new Date(body.releaseDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "releaseDate must be a valid date string" },
          { status: 400 }
        );
      }
      releaseDate = parsed;
    }

    const recording = await prisma.recording.create({
      data: {
        tenantId,
        artistId,
        isrc,
        title,
        releaseDate,
        label: body.label?.trim() || null,
        upc: body.upc?.trim() || null,
      },
    });

    return NextResponse.json({ recording });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "An ISRC with that value already exists in this tenant" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error?.message ?? "Failed to create recording" },
      { status: 500 }
    );
  }
}
