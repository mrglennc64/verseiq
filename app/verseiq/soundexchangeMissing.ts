import type { TrackISRCRecord } from "./types";
import type { SoundExchangeMatch } from "./usAudit";

export type SoundExchangeGap = {
  isrc: string;
  reason: string;
};

export function detectSoundExchangeGaps(
  tracks: TrackISRCRecord[],
  matches: SoundExchangeMatch[]
): SoundExchangeGap[] {
  const gaps: SoundExchangeGap[] = [];

  for (const t of tracks) {
    const m = matches.find((x) => x.isrc === t.isrc);
    if (!m || !m.found) {
      gaps.push({
        isrc: t.isrc,
        reason: "Track appears on DSP but not in SoundExchange repertoire",
      });
    }
  }

  return gaps;
}
