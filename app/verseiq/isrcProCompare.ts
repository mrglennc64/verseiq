import type { TrackISRCRecord, PRORepertoireEntry } from "./types";

export type ISRCProIssue =
  | { type: "MISSING_IN_PRO"; isrc: string; pro: string }
  | { type: "TITLE_MISMATCH"; isrc: string; pro: string; dspTitle: string; proTitle: string }
  | { type: "ARTIST_MISMATCH"; isrc: string; pro: string; dspArtist: string; proArtist: string }
  | { type: "PUBLISHER_SHARE_MISMATCH"; isrc: string; pro: string; details: string }
  | { type: "WRITER_SHARE_MISMATCH"; isrc: string; pro: string; details: string };

export function compareISRCsWithPROs(
  tracks: TrackISRCRecord[],
  proEntries: PRORepertoireEntry[]
): ISRCProIssue[] {
  const issues: ISRCProIssue[] = [];

  for (const track of tracks) {
    const related = proEntries.filter(
      (entry) =>
        entry.isrc === track.isrc ||
        entry.title.toLowerCase() === track.title.toLowerCase()
    );

    if (related.length === 0) {
      issues.push({ type: "MISSING_IN_PRO", isrc: track.isrc, pro: "MULTIPLE/UNKNOWN" });
      continue;
    }

    for (const entry of related) {
      if (entry.title && entry.title.toLowerCase() !== track.title.toLowerCase()) {
        issues.push({
          type: "TITLE_MISMATCH",
          isrc: track.isrc,
          pro: entry.pro,
          dspTitle: track.title,
          proTitle: entry.title,
        });
      }

      if (entry.artist && entry.artist.toLowerCase() !== track.artist.toLowerCase()) {
        issues.push({
          type: "ARTIST_MISMATCH",
          isrc: track.isrc,
          pro: entry.pro,
          dspArtist: track.artist,
          proArtist: entry.artist,
        });
      }

      const writerShares = entry.writers
        .map((writer) => writer.share ?? 0)
        .reduce((sum, value) => sum + value, 0);
      const publisherShares = entry.publishers
        .map((publisher) => publisher.share ?? 0)
        .reduce((sum, value) => sum + value, 0);

      if (writerShares && Math.abs(writerShares - 100) > 1) {
        issues.push({
          type: "WRITER_SHARE_MISMATCH",
          isrc: track.isrc,
          pro: entry.pro,
          details: `Writer shares sum to ${writerShares}, expected ~100`,
        });
      }

      if (publisherShares && Math.abs(publisherShares - 100) > 1) {
        issues.push({
          type: "PUBLISHER_SHARE_MISMATCH",
          isrc: track.isrc,
          pro: entry.pro,
          details: `Publisher shares sum to ${publisherShares}, expected ~100`,
        });
      }
    }
  }

  return issues;
}
