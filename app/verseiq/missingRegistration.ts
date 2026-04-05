import type { TrackISRCRecord, PRORepertoireEntry } from "./types";

export type MissingRegistration = {
  isrc: string;
  pro: string;
  reason: string;
};

export function detectMissingRegistrations(
  tracks: TrackISRCRecord[],
  proEntries: PRORepertoireEntry[]
): MissingRegistration[] {
  const issues: MissingRegistration[] = [];

  const byPro: Record<string, PRORepertoireEntry[]> = {};
  for (const entry of proEntries) {
    if (!byPro[entry.pro]) {
      byPro[entry.pro] = [];
    }
    byPro[entry.pro].push(entry);
  }

  for (const track of tracks) {
    for (const [pro, entries] of Object.entries(byPro)) {
      const found = entries.some(
        (entry) =>
          entry.isrc === track.isrc ||
          entry.title.toLowerCase() === track.title.toLowerCase()
      );

      if (!found) {
        issues.push({
          isrc: track.isrc,
          pro,
          reason: "Track appears on DSP but not in PRO repertoire",
        });
      }
    }
  }

  return issues;
}
