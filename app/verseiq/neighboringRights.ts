import type { TrackISRCRecord, NeighboringRightsEntry } from "./types";

export type NeighboringRightsIssue = {
  isrc: string;
  society: string;
  reason: string;
};

export function checkNeighboringRights(
  tracks: TrackISRCRecord[],
  neighboringEntries: NeighboringRightsEntry[]
): NeighboringRightsIssue[] {
  const issues: NeighboringRightsIssue[] = [];

  for (const track of tracks) {
    const related = neighboringEntries.filter((entry) => entry.isrc === track.isrc);

    if (related.length === 0) {
      issues.push({
        isrc: track.isrc,
        society: "MULTIPLE/UNKNOWN",
        reason: "No neighboring rights registration found",
      });
      continue;
    }

    for (const entry of related) {
      if (!entry.registered) {
        issues.push({
          isrc: track.isrc,
          society: entry.society,
          reason: "Entry exists but not marked as registered",
        });
      }
    }
  }

  return issues;
}
