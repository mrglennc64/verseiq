/**
 * Generic statement CSV parser with lenient header detection.
 *
 * DSP/PRO/CMO exports all use different column names for the same fields
 * ("Net Payable", "Royalties (USD)", "Amount Due", etc.). This parser looks
 * at the first row and builds a mapping from known canonical fields to the
 * actual header names found. Unknown columns are preserved in `rawRow`.
 */
import { parse } from "csv-parse/sync";

export type CanonicalField = "isrc" | "title" | "artist" | "amount" | "period";

const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  isrc: ["isrc"],
  title: ["title", "track", "track title", "song", "song title", "recording title", "work title"],
  artist: [
    "artist",
    "performer",
    "featured artist",
    "main artist",
    "artist name",
    "primary artist",
  ],
  amount: [
    "amount",
    "net",
    "net amount",
    "net payable",
    "net payable (usd)",
    "royalty",
    "royalties",
    "royalty amount",
    "royalties (usd)",
    "usd",
    "earnings",
    "revenue",
    "gross",
    "gross amount",
    "amount due",
    "total",
  ],
  period: [
    "period",
    "month",
    "quarter",
    "statement period",
    "reporting period",
    "payment period",
  ],
};

function normalize(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, " ");
}

function buildHeaderMap(headers: string[]): Partial<Record<CanonicalField, string>> {
  const map: Partial<Record<CanonicalField, string>> = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalize(h) }));

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [CanonicalField, string[]][]) {
    const hit = normalized.find((n) => aliases.includes(n.norm));
    if (hit) map[field] = hit.raw;
  }
  return map;
}

function parseAmount(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const str = String(raw).trim();
  if (!str) return 0;
  // Strip currency symbols, commas, parens-for-negative.
  let cleaned = str.replace(/[$€£¥]/g, "").replace(/,/g, "").trim();
  let negative = false;
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    negative = true;
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith("-")) {
    negative = true;
    cleaned = cleaned.slice(1);
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

function cleanIsrc(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase().replace(/[-\s]/g, "");
  if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(s)) return null;
  return s;
}

export type ParsedLine = {
  isrc: string | null;
  title: string | null;
  artist: string | null;
  period: string | null;
  amount: number;
  rawRow: Record<string, unknown>;
};

export type ParseResult = {
  headerMap: Partial<Record<CanonicalField, string>>;
  headers: string[];
  lines: ParsedLine[];
  warnings: string[];
};

export function parseStatementCsv(csvText: string): ParseResult {
  const warnings: string[] = [];

  // Normalize smart quotes, NBSPs, stray CRs, and strip BOM anywhere —
  // copy-pasted / Notepad-saved CSVs often carry these and csv-parse is strict.
  const normalized = csvText
    .replace(/\uFEFF/g, "") // BOM (anywhere, not just the start)
    .replace(/\u00A0/g, " ") // non-breaking space → regular space
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  let records: Record<string, unknown>[];
  try {
    records = parse(normalized, {
      columns: true,
      skip_empty_lines: true,
      skip_records_with_error: true,
      ltrim: true,
      rtrim: true,
      relax_column_count: true,
      relax_quotes: true,
      bom: true,
    });
  } catch (err: any) {
    // Give the user a look at what's actually on the failing line.
    const lineMatch = /line (\d+)/.exec(String(err?.message ?? ""));
    const lineNo = lineMatch ? parseInt(lineMatch[1], 10) : null;
    let snippet = "";
    if (lineNo) {
      const lines = normalized.split("\n");
      const raw = lines[lineNo - 1] ?? "";
      // Show the line plus character codes so invisibles are visible.
      const codes = Array.from(raw.slice(0, 80))
        .map((c) => c.charCodeAt(0))
        .join(",");
      snippet = ` | line ${lineNo}: ${JSON.stringify(raw.slice(0, 200))} | char codes: [${codes}]`;
    }
    throw new Error(`CSV parse error: ${err?.message ?? err}${snippet}`);
  }

  if (records.length === 0) {
    return { headerMap: {}, headers: [], lines: [], warnings: ["File has no data rows"] };
  }

  const headers = Object.keys(records[0]);
  const headerMap = buildHeaderMap(headers);

  if (!headerMap.isrc) warnings.push("No ISRC column detected — nothing will match the catalog");
  if (!headerMap.amount) warnings.push("No amount column detected — all rows will show $0");

  const lines: ParsedLine[] = records.map((row) => ({
    isrc: headerMap.isrc ? cleanIsrc(row[headerMap.isrc]) : null,
    title: headerMap.title ? String(row[headerMap.title] ?? "").trim() || null : null,
    artist: headerMap.artist ? String(row[headerMap.artist] ?? "").trim() || null : null,
    period: headerMap.period ? String(row[headerMap.period] ?? "").trim() || null : null,
    amount: headerMap.amount ? parseAmount(row[headerMap.amount]) : 0,
    rawRow: row,
  }));

  return { headerMap, headers, lines, warnings };
}
