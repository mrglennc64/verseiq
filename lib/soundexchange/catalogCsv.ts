// Builds the SoundExchange catalog CSV — one row per ISRC with the minimal
// fields SE's onboarding packet asks for. Header names are chosen to match
// what a human reviewer at SE would expect; SE doesn't publish a strict
// machine-readable schema for intake, so this is a sensible default format.

import type { Artist, Recording } from "@prisma/client";

const HEADERS = [
  "ISRC",
  "Recording Title",
  "Artist Legal Name",
  "Stage Name",
  "Label",
  "UPC",
  "Release Date",
] as const;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCatalogCsv(
  artist: Pick<Artist, "legalName" | "stageName">,
  recordings: Pick<Recording, "isrc" | "title" | "label" | "upc" | "releaseDate">[]
): string {
  const lines: string[] = [];
  lines.push(HEADERS.join(","));

  for (const r of recordings) {
    const row = [
      r.isrc || "",
      r.title || "",
      artist.legalName,
      artist.stageName || "",
      r.label || "",
      r.upc || "",
      r.releaseDate ? new Date(r.releaseDate).toISOString().slice(0, 10) : "",
    ];
    lines.push(row.map(csvEscape).join(","));
  }

  return lines.join("\n") + "\n";
}
