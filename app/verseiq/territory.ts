export type TerritoryCode = "SE" | "DE" | "FR" | "UK" | "US" | "OTHER";

export const PRO_BY_TERRITORY: Record<TerritoryCode, string> = {
  SE: "STIM",
  DE: "GEMA",
  FR: "SACEM",
  UK: "PRS",
  US: "SoundExchange",
  OTHER: "Unknown",
};

const SE_KEYWORDS = ["sweden", "sverige", "svensk", "rix fm", "nrj sweden", "vm låtar"];
const DE_KEYWORDS = ["germany", "deutschland", "deutsche", "berlin", "hamburg"];
const FR_KEYWORDS = ["france", "français", "francais", "paris"];
const UK_KEYWORDS = ["uk", "british", "england", "london", "manchester"];
const US_KEYWORDS = ["usa", "us ", "united states", "america", "nyc", "la "];

function matchAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export type PlaylistMetadata = {
  id: string;
  name: string;
  followers: number;
  description: string;
  ownerName: string;
  ownerType: string;
  isEditorial: boolean;
  tracks?: Array<{
    title: string;
    artist: string;
    isrc?: string;
  }>;
};

export function inferTerritoryFromPlaylist(playlist: {
  name: string;
  description: string;
  ownerName: string;
}): TerritoryCode {
  const text = `${playlist.name} ${playlist.description} ${playlist.ownerName}`.toLowerCase();

  if (matchAny(text, SE_KEYWORDS)) return "SE";
  if (matchAny(text, DE_KEYWORDS)) return "DE";
  if (matchAny(text, FR_KEYWORDS)) return "FR";
  if (matchAny(text, UK_KEYWORDS)) return "UK";
  if (matchAny(text, US_KEYWORDS)) return "US";

  return "OTHER";
}

export function aggregateGapsByTerritory(gaps: PlaylistMetadata[]) {
  const result: Record<
    TerritoryCode,
    { playlists: PlaylistMetadata[]; totalFollowers: number }
  > = {
    SE: { playlists: [], totalFollowers: 0 },
    DE: { playlists: [], totalFollowers: 0 },
    FR: { playlists: [], totalFollowers: 0 },
    UK: { playlists: [], totalFollowers: 0 },
    US: { playlists: [], totalFollowers: 0 },
    OTHER: { playlists: [], totalFollowers: 0 },
  };

  for (const playlist of gaps) {
    const territory = inferTerritoryFromPlaylist(playlist);
    result[territory].playlists.push(playlist);
    result[territory].totalFollowers += playlist.followers ?? 0;
  }

  return result;
}
