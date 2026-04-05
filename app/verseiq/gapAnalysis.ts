export function computePlaylistGaps(targetPlaylists: any[], referencePlaylists: any[]) {
  const targetIds = new Set(targetPlaylists.map((playlist) => playlist.id));
  return referencePlaylists.filter((playlist) => !targetIds.has(playlist.id));
}