import type { GapReport, MissingIsrc } from "../types/gapReport";

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
  return out.map((value) => value.trim());
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
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

function pick(row: Record<string, string>, candidates: string[]): string {
  const lowered = new Map<string, string>();
  Object.entries(row).forEach(([key, value]) => {
    lowered.set(key.trim().toLowerCase(), String(value ?? "").trim());
  });

  for (const candidate of candidates) {
    const value = lowered.get(candidate.toLowerCase());
    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeIsrc(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

function isValidIsrc(value: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(value);
}

type CatalogRow = {
  isrc: string;
  title: string;
  artist: string;
};

function normalizeSpotifyRows(rows: Array<Record<string, string>>): CatalogRow[] {
  const deduped = new Map<string, CatalogRow>();

  for (const row of rows) {
    const isrc = normalizeIsrc(pick(row, ["isrc"]));
    if (!isValidIsrc(isrc) || deduped.has(isrc)) {
      continue;
    }

    deduped.set(isrc, {
      isrc,
      title: pick(row, ["track_name", "title", "name"]),
      artist: pick(row, ["artist_names", "artist", "artist_name"]),
    });
  }

  return Array.from(deduped.values()).sort((left, right) => left.isrc.localeCompare(right.isrc));
}

function normalizeSoundExchangeRows(rows: Array<Record<string, string>>): string[] {
  const seen = new Set<string>();

  for (const row of rows) {
    const isrc = normalizeIsrc(pick(row, ["isrc"]));
    if (isValidIsrc(isrc)) {
      seen.add(isrc);
    }
  }

  return Array.from(seen).sort();
}

export function computeGapReport(
  soundexchangeCsv: Buffer | string,
  spotifyCsv: Buffer | string
): GapReport {
  const soundexchangeText = Buffer.isBuffer(soundexchangeCsv)
    ? soundexchangeCsv.toString("utf-8")
    : soundexchangeCsv;
  const spotifyText = Buffer.isBuffer(spotifyCsv)
    ? spotifyCsv.toString("utf-8")
    : spotifyCsv;

  const spotifyRows = normalizeSpotifyRows(parseCsv(spotifyText));
  const soundexchangeIsrcs = normalizeSoundExchangeRows(parseCsv(soundexchangeText));

  const spotifySet = new Set(spotifyRows.map((row) => row.isrc));
  const soundexchangeSet = new Set(soundexchangeIsrcs);
  const spotifyIndex = new Map(spotifyRows.map((row) => [row.isrc, row]));

  const missingInSoundexchange: MissingIsrc[] = Array.from(spotifySet)
    .filter((isrc) => !soundexchangeSet.has(isrc))
    .sort()
    .map((isrc) => spotifyIndex.get(isrc))
    .filter((row): row is CatalogRow => Boolean(row))
    .map((row) => ({ isrc: row.isrc, title: row.title, artist: row.artist }));

  const presentInSoundexchange = Array.from(spotifySet)
    .filter((isrc) => soundexchangeSet.has(isrc))
    .sort();

  const soundexchangeOrphans = Array.from(soundexchangeSet)
    .filter((isrc) => !spotifySet.has(isrc))
    .sort();

  return {
    spotifyUniqueIsrc: spotifySet.size,
    soundexchangeUniqueIsrc: soundexchangeSet.size,
    missingInSoundexchange,
    presentInSoundexchange,
    soundexchangeOrphans,
    gapRate: spotifySet.size > 0 ? missingInSoundexchange.length / spotifySet.size : 0,
  };
}
