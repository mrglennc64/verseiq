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
  let score = 0;
  const reasons: string[] = [];

  if (!track.isrc) {
    score += 10;
    reasons.push("Track lacks ISRC (may affect identification across systems)");
  } else {
    score += 5;
    reasons.push("Track has ISRC (eligible for cross-system matching)");
  }

  if (playback.level === "medium") {
    score += 20;
    reasons.push("Moderate playback activity detected");
  }

  if (playback.level === "high") {
    score += 35;
    reasons.push("Strong playback activity signals");
  }

  if (track.registered === false) {
    score += 25;
    reasons.push("Track not present in provided registration dataset");
  }

  if (track.registered === null || track.registered === undefined) {
    reasons.push("Registration status unknown");
  }

  if (ageBucket === "established" || ageBucket === "legacy") {
    score += 10;
    reasons.push("Catalog maturity increases likelihood of external usage");
  }

  score = Math.min(100, score);

  let tier: RoyaltySignalTier = "low";
  if (score >= 60) tier = "elevated";
  else if (score >= 30) tier = "emerging";

  let confidence: "low" | "medium" | "high" = "low";
  if (track.isrc && track.registered !== null && track.registered !== undefined) {
    confidence = "high";
  } else if (track.isrc) {
    confidence = "medium";
  }

  const message =
    tier === "elevated"
      ? "This track shows signals consistent with potential royalty gaps."
      : tier === "emerging"
      ? "Some indicators suggest possible metadata or registration gaps."
      : "Limited indicators of royalty gaps based on available data.";

  return { score, tier, confidence, reasons, message };
}
