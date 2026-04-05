import type { TrackISRCRecord } from "./types";

export type ReleaseAgeBucket = "RECENT" | "MID" | "CATALOG";

export type ReleaseTimelineIssue = {
  isrc: string;
  bucket: ReleaseAgeBucket;
  reason: string;
};

export function bucketReleaseYear(year: number): ReleaseAgeBucket {
  const now = new Date().getFullYear();
  if (year >= now - 2) {
    return "RECENT";
  }
  if (year >= now - 7) {
    return "MID";
  }
  return "CATALOG";
}

export function analyzeReleaseTimeline(tracks: TrackISRCRecord[]): ReleaseTimelineIssue[] {
  const issues: ReleaseTimelineIssue[] = [];

  for (const track of tracks) {
    if (!track.releaseDate) {
      continue;
    }

    const year = new Date(track.releaseDate).getFullYear();
    if (!Number.isFinite(year)) {
      continue;
    }

    const bucket = bucketReleaseYear(year);
    if (bucket === "CATALOG") {
      issues.push({
        isrc: track.isrc,
        bucket,
        reason: "Older catalog track - high retroactive claim potential",
      });
    }
  }

  return issues;
}
