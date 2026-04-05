export type TerritoryCode = "SE" | "NO" | "DK" | "FI" | "DE" | "FR" | "UK" | "US" | "OTHER";

export type TrackISRCRecord = {
  isrc: string;
  title: string;
  artist: string;
  label?: string;
  releaseName?: string;
  releaseDate?: string;
  upc?: string;
  territory?: TerritoryCode;
};

export type PRORepertoireEntry = {
  pro: string;
  isrc?: string;
  iswc?: string;
  title: string;
  artist: string;
  writers: { name: string; ipi?: string; share?: number }[];
  publishers: { name: string; ipi?: string; share?: number }[];
  status?: string;
};

export type NeighboringRightsEntry = {
  society: string;
  isrc: string;
  artist: string;
  title: string;
  registered: boolean;
};

export type PlaylistInfo = {
  id: string;
  name: string;
  followers: number;
  description: string;
  ownerName: string;
  ownerType: string;
  isEditorial: boolean;
  territory: TerritoryCode;
  isRadioLinked: boolean;
  valueScore: number;
};
