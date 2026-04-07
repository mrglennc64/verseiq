import { RoyaltyTrack } from "./types";

export type CatalogAgeBucket = "new" | "developing" | "established" | "legacy";

function monthsSince(dateStr: string | null, now: Date): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return 0;
  return (
    (now.getFullYear() - parsed.getFullYear()) * 12 +
    (now.getMonth() - parsed.getMonth())
  );
}

export function getTrackAgeBucket(
  track: RoyaltyTrack,
  now: Date = new Date()
): CatalogAgeBucket {
  const months = monthsSince(track.release_date, now);
  if (months < 6) return "new";
  if (months < 12) return "developing";
  if (months < 36) return "established";
  return "legacy";
}
