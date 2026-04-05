import type { PlaylistInfo, TrackISRCRecord } from "./types";

export type SoundExchangeMatch = {
  isrc: string;
  found: boolean;
  title?: string;
  artist?: string;
  label?: string;
};

export type USRecoveryPotential = {
  isrc: string;
  missingInSoundExchange: boolean;
  usPlaylistFollowers: number;
  usRadioLinkedPlaylists: number;
  score: number;
};

export type USAuditSummary = {
  artistName: string;
  tracks: USRecoveryPotential[];
  totalEstimatedRange: { min: number; max: number };
  feeRange: { min: number; max: number };
};

function estimateUSRoyaltyRangeForTrack(followers: number): { min: number; max: number } {
  const convMin = 0.0005;
  const convMax = 0.003;
  const rateMin = 0.001;
  const rateMax = 0.003;

  const minStreams = followers * convMin;
  const maxStreams = followers * convMax;

  return {
    min: minStreams * rateMin,
    max: maxStreams * rateMax,
  };
}

export function buildUSPriorityAudit(params: {
  artistName: string;
  tracks: TrackISRCRecord[];
  soundExchangeMatches: SoundExchangeMatch[];
  usPlaylists: PlaylistInfo[];
  feePercent: number;
}): USAuditSummary {
  const { artistName, tracks, soundExchangeMatches, usPlaylists, feePercent } = params;

  const byISRCFollowers: Record<string, number> = {};
  const byISRCRadioCount: Record<string, number> = {};

  for (const p of usPlaylists) {
    const key = "ALL";
    byISRCFollowers[key] = (byISRCFollowers[key] || 0) + p.followers;
    if (p.isRadioLinked) {
      byISRCRadioCount[key] = (byISRCRadioCount[key] || 0) + 1;
    }
  }

  const potentials: USRecoveryPotential[] = [];
  let totalMin = 0;
  let totalMax = 0;

  for (const t of tracks) {
    const match = soundExchangeMatches.find((m) => m.isrc === t.isrc);
    const missingInSE = !match || !match.found;

    const followers = byISRCFollowers.ALL || 0;
    const radioCount = byISRCRadioCount.ALL || 0;

    const { min, max } = estimateUSRoyaltyRangeForTrack(followers);

    let score = 0;
    if (missingInSE) {
      score += 50;
    }
    if (followers > 0) {
      score += Math.min(30, Math.log10(followers + 10) * 10);
    }
    if (radioCount > 0) {
      score += Math.min(20, radioCount * 5);
    }
    if (score > 100) {
      score = 100;
    }

    if (missingInSE && followers > 0) {
      totalMin += min;
      totalMax += max;
    }

    potentials.push({
      isrc: t.isrc,
      missingInSoundExchange: missingInSE,
      usPlaylistFollowers: followers,
      usRadioLinkedPlaylists: radioCount,
      score,
    });
  }

  const feeMin = totalMin * (feePercent / 100);
  const feeMax = totalMax * (feePercent / 100);

  return {
    artistName,
    tracks: potentials,
    totalEstimatedRange: { min: totalMin, max: totalMax },
    feeRange: { min: feeMin, max: feeMax },
  };
}
