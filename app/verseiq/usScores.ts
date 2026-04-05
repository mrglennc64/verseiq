import type { USAuditSummary } from "./usAudit";

export type USArtistScore = {
  artistName: string;
  recoveryPotentialScore: number;
};

export function computeUSArtistScore(audit: USAuditSummary): USArtistScore {
  const anyMissing = audit.tracks.some((t) => t.missingInSoundExchange);
  const avgTrackScore =
    audit.tracks.reduce((sum, t) => sum + t.score, 0) / (audit.tracks.length || 1);

  let score = avgTrackScore;
  if (!anyMissing) {
    score = Math.min(score, 30);
  }

  return {
    artistName: audit.artistName,
    recoveryPotentialScore: Math.round(score),
  };
}
