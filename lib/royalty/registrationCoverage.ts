import { RoyaltyTrack } from "./types";

export type RegistrationCoverageResult = {
  totalTracks: number;
  registeredCount: number;
  unregisteredCount: number;
  coveragePercent: number;
};

export function analyzeRegistrationCoverage(
  tracks: RoyaltyTrack[]
): RegistrationCoverageResult {
  const totalTracks = tracks.length;
  const registeredCount = tracks.filter((t) => t.registered === true).length;
  const unregisteredCount = tracks.filter((t) => t.registered === false).length;
  const coveragePercent =
    totalTracks === 0 ? 0 : (registeredCount / totalTracks) * 100;

  return {
    totalTracks,
    registeredCount,
    unregisteredCount,
    coveragePercent: Math.round(coveragePercent * 10) / 10,
  };
}
