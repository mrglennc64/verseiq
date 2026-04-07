export type RoyaltyTrack = {
  track_id: string;
  track_name: string;
  isrc: string | null;
  album_id: string;
  album_name: string;
  release_date: string | null;
  popularity?: number;      // optional, from Spotify
  streams?: number;         // optional, future
  registered?: boolean | null; // user-provided or inferred
  distributor?: string | null; // user-provided
};

export type RoyaltyArtistCatalog = {
  artist: {
    id: string;
    name: string;
    genres?: string[];
    popularity?: number;
  };
  albums: {
    id: string;
    name: string;
    release_date: string | null;
    total_tracks: number;
  }[];
  tracks: RoyaltyTrack[];
};
