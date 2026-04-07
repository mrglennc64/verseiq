import { RoyaltyTrack } from "./types";

export type PlaybackSignalLevel = "low" | "medium" | "high";

export type PlaybackSignals = {
  level: PlaybackSignalLevel;
  indicators: string[];
};

function monthsSince(dateStr: string | null, now: Date): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return 0;
  return (
    (now.getFullYear() - parsed.getFullYear()) * 12 +
    (now.getMonth() - parsed.getMonth())
  );
}

function bumpOneLevel(level: PlaybackSignalLevel): PlaybackSignalLevel {
  if (level === "low") return "medium";
  return "high";
}

export function getPlaybackSignals(
  track: RoyaltyTrack,
  now: Date = new Date()
): PlaybackSignals {
  let level: PlaybackSignalLevel = "low";
  const ageMonths = monthsSince(track.release_date, now);
  const popularity = track.popularity ?? 0;

  if (!track.isrc) {
    level = "low";
  } else if (ageMonths >= 6 && popularity > 40) {
    level = "high";
  } else if (ageMonths >= 6 && popularity > 20) {
    level = "medium";
  }

  if (typeof track.streams === "number" && track.streams > 50_000) {
    level = bumpOneLevel(level);
  }

  return {
    level,
    indicators: ["Airplay indicators", "Streaming presence", "Distribution footprint"],
  };
}
