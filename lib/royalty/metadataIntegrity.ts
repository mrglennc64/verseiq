import { RoyaltyTrack } from "./types";

export type MetadataIntegrityResult = {
  totalTracks: number;
  missingIsrcCount: number;
  duplicateTitleCount: number;
  releaseDateMissingCount: number;
  score: number; // 0–100
};

export function analyzeMetadataIntegrity(
  tracks: RoyaltyTrack[]
): MetadataIntegrityResult {
  const totalTracks = tracks.length;
  const missingIsrcCount = tracks.filter((t) => !t.isrc).length;
  const releaseDateMissingCount = tracks.filter((t) => !t.release_date).length;

  // Count titles that appear more than once (case-insensitive)
  const titleCounts = new Map<string, number>();
  for (const t of tracks) {
    const key = t.track_name.toLowerCase().trim();
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }
  const duplicateTitleCount = Array.from(titleCounts.values()).filter((c) => c > 1).length;

  let score = 100;
  score -= Math.min(40, missingIsrcCount * 1);
  score -= Math.min(20, duplicateTitleCount * 0.5);
  score -= Math.min(20, releaseDateMissingCount * 0.5);
  score = Math.max(0, Math.min(100, score));

  return {
    totalTracks,
    missingIsrcCount,
    duplicateTitleCount,
    releaseDateMissingCount,
    score: Math.round(score),
  };
}
