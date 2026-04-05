import { aggregateGapsByTerritory, PRO_BY_TERRITORY, type PlaylistMetadata, type TerritoryCode } from "./territory";
import { estimateRoyaltyRangeForTerritory, splitRoyaltyIntoSources } from "./royalty";
import { computeRoyaltyHealthScore } from "./health";

export type TerritoryRow = {
  territory: TerritoryCode;
  pro: string;
  playlists: number;
  followers: number;
  minRoyalty: number;
  maxRoyalty: number;
  needsManualProCheck: boolean;
};

export function buildRoyaltyAudit(gaps: PlaylistMetadata[]) {
  const byTerritory = aggregateGapsByTerritory(gaps);

  const territoryRows: TerritoryRow[] = [];

  let globalMin = 0;
  let globalMax = 0;

  (Object.keys(byTerritory) as TerritoryCode[]).forEach((territory) => {
    const { playlists, totalFollowers } = byTerritory[territory];
    if (playlists.length === 0) {
      return;
    }

    const { minRoyalty, maxRoyalty } = estimateRoyaltyRangeForTerritory(
      totalFollowers,
      territory
    );

    globalMin += minRoyalty;
    globalMax += maxRoyalty;

    const pro = PRO_BY_TERRITORY[territory];

    territoryRows.push({
      territory,
      pro,
      playlists: playlists.length,
      followers: totalFollowers,
      minRoyalty,
      maxRoyalty,
      needsManualProCheck: totalFollowers > 0 && pro !== "Unknown",
    });
  });

  const split = splitRoyaltyIntoSources(globalMin, globalMax);
  const healthScore = computeRoyaltyHealthScore(byTerritory);

  return { territoryRows, globalMin, globalMax, split, healthScore };
}
