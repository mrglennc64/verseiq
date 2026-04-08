import type { PlaybackSignalLevel } from "./playbackSignals";
import { RoyaltyTrack } from "./types";
import { PlaybackSignals } from "./playbackSignals";
import { CatalogAgeBucket } from "./catalogAge";

export type RoyaltySignalTier = "low" | "emerging" | "elevated";

export type RoyaltySignalResult = {
  score: number;
  tier: RoyaltySignalTier;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  message: string;
};

export function getRoyaltySignal(
  track: RoyaltyTrack,
  playback: PlaybackSignals,
  ageBucket: CatalogAgeBucket
): RoyaltySignalResult {
  const reasons: string[] = [];

  const missingISRCRatio = track.isrc ? 0 : 1;
  const unregisteredRatio = track.registered === true ? 0 : 1;

  const playbackScoreByLevel: Record<PlaybackSignalLevel, number> = {
    low: 0.2,
    medium: 0.6,
    high: 1.0,
  };
  const ageScoreByBucket: Record<CatalogAgeBucket, number> = {
    new: 0.2,
    developing: 0.5,
    established: 0.8,
    legacy: 1.0,
  };

  const weightedScore =
    0.30 * missingISRCRatio +
    0.35 * unregisteredRatio +
    0.25 * playbackScoreByLevel[playback.level] +
    0.10 * ageScoreByBucket[ageBucket];

  const score = Math.round(weightedScore * 100);

  if (!track.isrc) reasons.push("Missing ISRC weakens cross-system matching");
  if (track.registered !== true) reasons.push("Track appears unregistered in comparison dataset");
  if (playback.level !== "low") reasons.push("External usage signals detected from streaming activity");
  if (ageBucket === "established" || ageBucket === "legacy") {
    reasons.push("Older catalog windows increase unpaid royalty risk");
  }
  if (reasons.length === 0) reasons.push("No major royalty leakage indicators detected");

  let tier: RoyaltySignalTier = "low";
  if (score >= 61) tier = "elevated";
  else if (score >= 31) tier = "emerging";

  let confidence: "low" | "medium" | "high" = "low";
  if (track.isrc && track.registered !== null && track.registered !== undefined) {
    confidence = "high";
  } else if (track.isrc) {
    confidence = "medium";
  }

  const message =
    tier === "elevated"
      ? "High probability of unclaimed royalties detected."
      : tier === "emerging"
      ? "Medium royalty leakage risk detected."
      : "Low current leakage risk based on available evidence.";

  return { score, tier, confidence, reasons, message };
}
