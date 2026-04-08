import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const scanId = req.nextUrl.searchParams.get("scanId") || "";
  if (!scanId) {
    return NextResponse.json({ error: "scanId is required" }, { status: 400 });
  }

  const scan = await prisma.royaltyScan.findUnique({ where: { id: scanId } });
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  if (scan.status !== "complete") {
    return NextResponse.json(
      { error: "Scan not complete", status: scan.status },
      { status: 409 }
    );
  }

  return NextResponse.json({
    scanId: scan.id,
    status: scan.status,
    result: scan.resultJson,
  });
}