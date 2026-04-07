import { RoyaltyTrack } from "./types";
import { RoyaltySignalResult } from "./probabilityEngine";

export type EscrowEstimateResult = {
  estimatedUsd: number;
  perTrackAssumption: number;
  highProbabilityCount: number;
};

export function estimateEscrow(
  tracks: RoyaltyTrack[],
  signals: Map<string, RoyaltySignalResult>
): EscrowEstimateResult {
  const perTrackAssumption = 100;
  const highProbabilityCount = Array.from(signals.values()).filter(
    (s) => s.tier === "elevated"
  ).length;
  const estimatedUsd = highProbabilityCount * perTrackAssumption;

  return { estimatedUsd, perTrackAssumption, highProbabilityCount };
}
