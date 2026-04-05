import { inferTerritoryFromPlaylist, type PlaylistMetadata } from "./territory";

const TERRITORY_BONUS: Record<string, number> = {
  SE: 8,
  DE: 9,
  FR: 8,
  UK: 9,
  US: 10,
  OTHER: 5,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function computePlaylistValueScore(
  playlist: PlaylistMetadata,
  artistName: string
) {
  const followers = Number(playlist.followers ?? 0);
  const followersScore = clamp(Math.log10(followers + 1) * 10, 0, 35);

  const editorialScore = playlist.isEditorial ? 20 : 8;

  const text = `${playlist.name} ${playlist.description}`.toLowerCase();
  const artistLower = artistName.toLowerCase().trim();
  const genreMatchScore = artistLower && text.includes(artistLower) ? 20 : 6;

  const freshnessKeywords = ["new music", "fresh", "weekly", "daily", "updated"];
  const updateFrequencyScore = freshnessKeywords.some((keyword) => text.includes(keyword)) ? 15 : 5;

  const territory = inferTerritoryFromPlaylist(playlist);
  const territoryScore = TERRITORY_BONUS[territory] ?? TERRITORY_BONUS.OTHER;

  const total = clamp(
    followersScore + editorialScore + genreMatchScore + updateFrequencyScore + territoryScore,
    0,
    100
  );

  return {
    territory,
    score: Math.round(total),
  };
}
