import { RoyaltyTrack } from "./types";
import { RoyaltySignalResult } from "./probabilityEngine";
import { PlaybackSignalLevel } from "./playbackSignals";
import { CatalogAgeBucket } from "./catalogAge";

export type EscrowEstimateResult = {
  estimatedLowUsd: number;
  estimatedHighUsd: number;
  highProbabilityCount: number;
};

export function estimateTrackValue(
  playbackLevel: PlaybackSignalLevel,
  ageBucket: CatalogAgeBucket
): number {
  let base = 10;

  if (playbackLevel === "high") base = 50;
  if (playbackLevel === "medium") base = 20;

  if (ageBucket === "legacy") base *= 2;
  if (ageBucket === "established") base *= 1.5;

  return base;
}

export function estimateEscrow(
  tracks: RoyaltyTrack[],
  signals: Map<string, RoyaltySignalResult>,
  playbackByTrackId: Map<string, PlaybackSignalLevel>,
  ageByTrackId: Map<string, CatalogAgeBucket>
): EscrowEstimateResult {
  let estimatedLowUsd = 0;
  let highProbabilityCount = 0;

  for (const track of tracks) {
    const signal = signals.get(track.track_id);
    if (!signal || signal.tier !== "elevated") continue;

    const playbackLevel = playbackByTrackId.get(track.track_id) ?? "low";
    const ageBucket = ageByTrackId.get(track.track_id) ?? "new";
    estimatedLowUsd += estimateTrackValue(playbackLevel, ageBucket);
    highProbabilityCount += 1;
  }

  const estimatedHighUsd = estimatedLowUsd * 3;

  return { estimatedLowUsd, estimatedHighUsd, highProbabilityCount };
}
