export type SpotifySourceType = "artist" | "playlist";

export interface CatalogPreviewRow {
  trackName: string;
  artistNames: string;
  albumName: string;
  releaseDate: string;
  isrc?: string;
}

export interface ExportedCatalog {
  sourceType: SpotifySourceType;
  sourceId: string;
  sourceName: string;
  catalogName: string;
  artistId?: string;
  artistName?: string;
  uniqueIsrcs: number;
  tracksFound: number;
  tracksWithIsrc: number;
  tracksMissingIsrc: number;
  csv: string;
  previewRows: CatalogPreviewRow[];
  missingIsrcPreview: CatalogPreviewRow[];
}