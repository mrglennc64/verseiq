export interface MissingIsrc {
  isrc: string;
  title: string;
  artist: string;
}

export interface GapReport {
  spotifyUniqueIsrc: number;
  soundexchangeUniqueIsrc: number;
  missingInSoundexchange: MissingIsrc[];
  presentInSoundexchange: string[];
  soundexchangeOrphans: string[];
  gapRate: number;
}
