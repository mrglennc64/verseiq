import type { TerritoryCode } from "./territory";

const CONVERSION_RATE = {
  min: 0.001,
  max: 0.005,
};

const ROYALTY_PER_STREAM = {
  min: 0.002,
  max: 0.004,
};

const TERRITORY_MULTIPLIER: Record<TerritoryCode, number> = {
  SE: 1.0,
  DE: 1.1,
  FR: 1.0,
  UK: 1.1,
  US: 1.2,
  OTHER: 0.8,
};

export function estimateRoyaltyRangeForTerritory(
  totalFollowers: number,
  territory: TerritoryCode
) {
  const multiplier = TERRITORY_MULTIPLIER[territory];

  const minStreams = totalFollowers * CONVERSION_RATE.min;
  const maxStreams = totalFollowers * CONVERSION_RATE.max;

  const minRoyalty = minStreams * ROYALTY_PER_STREAM.min * multiplier;
  const maxRoyalty = maxStreams * ROYALTY_PER_STREAM.max * multiplier;

  return { minRoyalty, maxRoyalty };
}

export function splitRoyaltyIntoSources(minRoyalty: number, maxRoyalty: number) {
  return {
    streaming: {
      min: minRoyalty * 0.4,
      max: maxRoyalty * 0.4,
    },
    performance: {
      min: minRoyalty * 0.3,
      max: maxRoyalty * 0.3,
    },
    neighboring: {
      min: minRoyalty * 0.3,
      max: maxRoyalty * 0.3,
    },
  };
}
