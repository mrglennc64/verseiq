import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDefaultTenant, getCurrentTenantId } from "@/lib/tenant";
import { parseStatementCsv } from "@/lib/statementParser";

export const runtime = "nodejs";

/**
 * POST /api/statements
 * Accepts multipart form-data with `file` (CSV) and optional `sourcePlatform`.
 * Parses, matches lines to recordings by ISRC, and persists a Statement + StatementLines.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDefaultTenant();
    const tenantId = getCurrentTenantId();

    const form = await req.formData();
    const file = form.get("file");
    const sourcePlatform = (form.get("sourcePlatform") as string | null)?.trim() || "generic";
    const notes = (form.get("notes") as string | null)?.trim() || null;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const filename = (file as File).name || "upload.csv";
    const text = await (file as File).text();

    const parsed = parseStatementCsv(text);

    if (parsed.lines.length === 0) {
      return NextResponse.json(
        { error: "No data rows found", warnings: parsed.warnings },
        { status: 400 },
      );
    }

    // Build ISRC -> recordingId lookup from catalog
    const isrcs = Array.from(
      new Set(parsed.lines.map((l) => l.isrc).filter((x): x is string => !!x)),
    );
    const recordings = isrcs.length
      ? await prisma.recording.findMany({
          where: { tenantId, isrc: { in: isrcs } },
          select: { id: true, isrc: true },
        })
      : [];
    const recordingByIsrc = new Map(recordings.map((r) => [r.isrc, r.id]));

    // Aggregate totals
    let totalAmount = 0;
    let matchedRows = 0;
    let unmatchedAmount = 0;

    const lineCreates = parsed.lines.map((l) => {
      const recordingId = l.isrc ? recordingByIsrc.get(l.isrc) ?? null : null;
      const matched = !!recordingId;
      totalAmount += l.amount;
      if (matched) {
        matchedRows += 1;
      } else {
        unmatchedAmount += l.amount;
      }
      return {
        tenantId,
        recordingId,
        rawIsrc: l.isrc,
        rawTitle: l.title,
        rawArtist: l.artist,
        rawPeriod: l.period,
        amount: l.amount,
        matched,
        rawRow: l.rawRow as any,
      };
    });

    const totalRows = parsed.lines.length;
    const unmatchedRows = totalRows - matchedRows;

    const statement = await prisma.statement.create({
      data: {
        tenantId,
        sourcePlatform,
        sourceFilename: filename,
        totalRows,
        matchedRows,
        unmatchedRows,
        totalAmount,
        unmatchedAmount,
        notes,
        lines: { create: lineCreates },
      },
      select: {
        id: true,
        sourcePlatform: true,
        sourceFilename: true,
        uploadedAt: true,
        totalRows: true,
        matchedRows: true,
        unmatchedRows: true,
        totalAmount: true,
        unmatchedAmount: true,
      },
    });

    return NextResponse.json({
      statement,
      headerMap: parsed.headerMap,
      warnings: parsed.warnings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to ingest statement" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/statements
 * Lists statements for the current tenant, most recent first.
 */
export async function GET() {
  try {
    const tenantId = getCurrentTenantId();
    const statements = await prisma.statement.findMany({
      where: { tenantId },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        sourcePlatform: true,
        sourceFilename: true,
        uploadedAt: true,
        totalRows: true,
        matchedRows: true,
        unmatchedRows: true,
        totalAmount: true,
        unmatchedAmount: true,
        currency: true,
        notes: true,
      },
    });
    return NextResponse.json({ statements });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to load statements" },
      { status: 500 },
    );
  }
}
