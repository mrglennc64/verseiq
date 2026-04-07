import { NextRequest, NextResponse } from "next/server";

type Row = {
  isrc: string;
  title: string;
  artist: string;
  release: string;
  label: string;
  upc: string;
};

function isValidIsrc(value: string) {
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(value);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((v) => v.trim());
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function pick(row: Record<string, string>, candidates: string[]): string {
  const lowered = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    lowered.set(k.trim().toLowerCase(), String(v ?? "").trim());
  }

  for (const c of candidates) {
    const val = lowered.get(c.toLowerCase());
    if (val) {
      return val;
    }
  }

  return "";
}

function normalize(rows: Array<Record<string, string>>): Row[] {
  const out: Row[] = [];

  for (const raw of rows) {
    const isrc = pick(raw, ["isrc"]).toUpperCase();
    if (!isValidIsrc(isrc)) {
      continue;
    }

    out.push({
      isrc,
      title: pick(raw, ["title", "name", "track name"]),
      artist: pick(raw, ["artist", "artist name"]),
      release: pick(raw, ["release", "album"]),
      label: pick(raw, ["label", "release label"]),
      upc: pick(raw, ["upc"]),
    });
  }

  return out;
}

function toCsv(rows: Row[]): string {
  const esc = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const header = ["isrc", "title", "artist", "release", "label", "upc"].join(",");
  const body = rows
    .map((r) => [esc(r.isrc), esc(r.title), esc(r.artist), esc(r.release), esc(r.label), esc(r.upc)].join(","))
    .join("\n");

  return `${header}\n${body}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const soundexchangeFile = formData.get("soundexchangeCsv") as File | null;
    const spotifyFile = formData.get("spotifyCsv") as File | null;

    if (!soundexchangeFile || !spotifyFile) {
      return NextResponse.json(
        { error: "soundexchangeCsv and spotifyCsv files are required" },
        { status: 400 }
      );
    }

    const seText = await soundexchangeFile.text();
    const spText = await spotifyFile.text();

    const seRows = normalize(parseCsv(seText));
    const spRows = normalize(parseCsv(spText));

    const seSet = new Set(seRows.map((r) => r.isrc));
    const spSet = new Set(spRows.map((r) => r.isrc));

    const missingInSE = Array.from(spSet)
      .filter((isrc) => !seSet.has(isrc))
      .sort();
    const presentInSE = Array.from(spSet)
      .filter((isrc) => seSet.has(isrc))
      .sort();
    const seOrphans = Array.from(seSet)
      .filter((isrc) => !spSet.has(isrc))
      .sort();

    const spIndex = new Map(spRows.map((r) => [r.isrc, r]));

    const missingRows = missingInSE.map((isrc) => spIndex.get(isrc)!).filter(Boolean);
    const presentRows = presentInSE.map((isrc) => spIndex.get(isrc)!).filter(Boolean);

    const gapPct = spSet.size > 0 ? Number(((missingInSE.length / spSet.size) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      summary: {
        spotifyUniqueIsrc: spSet.size,
        soundexchangeUniqueIsrc: seSet.size,
        missingInSoundExchange: missingInSE.length,
        presentInSoundExchange: presentInSE.length,
        soundexchangeOrphans: seOrphans.length,
        gapPercent: gapPct,
      },
      missingInSoundExchange: missingRows,
      presentInSoundExchange: presentRows,
      soundexchangeOrphans: seOrphans,
      downloads: {
        missingCsv: toCsv(missingRows),
        presentCsv: toCsv(presentRows),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process CSV files", details: String(error) },
      { status: 500 }
    );
  }
}
