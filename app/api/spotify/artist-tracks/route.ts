import { NextRequest, NextResponse } from "next/server";
import { exportSpotifyCatalogCsv } from "../../../../lib/exportSpotifyCatalog";

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current);
  return out;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [] as Array<Record<string, string>>;
  }

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

export async function GET(req: NextRequest) {
  try {
    const artist = req.nextUrl.searchParams.get("id") || "";
    const token = req.nextUrl.searchParams.get("token") || "";

    if (!artist || !token) {
      return NextResponse.json({ error: "Missing id or token" }, { status: 400 });
    }

    const result = await exportSpotifyCatalogCsv(token, artist);
    const tracks = parseCsv(result.csv).map((row) => ({
      title: row.track_name || "",
      artists: (row.artist_names || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      isrc: row.isrc || undefined,
    }));

    return NextResponse.json({
      tracks,
      artistName: result.artistName,
      uniqueIsrcs: result.uniqueIsrcs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tracks", details: String(error) },
      { status: 500 }
    );
  }
}
