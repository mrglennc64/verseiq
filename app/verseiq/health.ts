import type { TerritoryCode } from "./territory";

type TerritoryAgg = {
  playlists: any[];
  totalFollowers: number;
};

export function computeRoyaltyHealthScore(
  byTerritory: Record<TerritoryCode, TerritoryAgg>
) {
  let totalFollowersInGaps = 0;
  let importantTerritoriesWithGaps = 0;

  const important: TerritoryCode[] = ["SE", "DE", "FR", "UK", "US"];

  (Object.keys(byTerritory) as TerritoryCode[]).forEach((territory) => {
    const agg = byTerritory[territory];
    if (agg.playlists.length === 0) {
      return;
    }

    totalFollowersInGaps += agg.totalFollowers;
    if (important.includes(territory)) {
      importantTerritoriesWithGaps += 1;
    }
  });

  const followerPressure = Math.min(totalFollowersInGaps / 5_000_000, 1);
  const territoryPressure = Math.min(importantTerritoriesWithGaps / 5, 1);

  const pressure = followerPressure * 0.7 + territoryPressure * 0.3;
  const score = Math.round((1 - pressure) * 100);

  return score;
}
