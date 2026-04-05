import type { TrackISRCRecord } from "./types";

export type MetadataSource = "Spotify" | "SoundExchange" | "MusicBrainz";

export type MetadataSnapshot = {
  source: MetadataSource;
  track: TrackISRCRecord;
};

export type MetadataIssue =
  | { type: "TITLE_INCONSISTENT"; isrc: string; values: Record<MetadataSource, string> }
  | { type: "ARTIST_INCONSISTENT"; isrc: string; values: Record<MetadataSource, string> }
  | { type: "LABEL_INCONSISTENT"; isrc: string; values: Record<MetadataSource, string> }
  | { type: "UPC_INCONSISTENT"; isrc: string; values: Record<MetadataSource, string> };

export function checkMetadataConsistency(
  snapshotsByISRC: Record<string, MetadataSnapshot[]>
): MetadataIssue[] {
  const issues: MetadataIssue[] = [];

  for (const [isrc, snapshots] of Object.entries(snapshotsByISRC)) {
    if (snapshots.length < 2) {
      continue;
    }

    const titleValues: Partial<Record<MetadataSource, string>> = {};
    const artistValues: Partial<Record<MetadataSource, string>> = {};
    const labelValues: Partial<Record<MetadataSource, string>> = {};
    const upcValues: Partial<Record<MetadataSource, string>> = {};

    snapshots.forEach((snapshot) => {
      titleValues[snapshot.source] = snapshot.track.title;
      artistValues[snapshot.source] = snapshot.track.artist;
      if (snapshot.track.label) {
        labelValues[snapshot.source] = snapshot.track.label;
      }
      if (snapshot.track.upc) {
        upcValues[snapshot.source] = snapshot.track.upc;
      }
    });

    const titles = new Set(Object.values(titleValues));
    if (titles.size > 1) {
      issues.push({
        type: "TITLE_INCONSISTENT",
        isrc,
        values: titleValues as Record<MetadataSource, string>,
      });
    }

    const artists = new Set(Object.values(artistValues));
    if (artists.size > 1) {
      issues.push({
        type: "ARTIST_INCONSISTENT",
        isrc,
        values: artistValues as Record<MetadataSource, string>,
      });
    }

    const labels = new Set(Object.values(labelValues));
    if (labels.size > 1) {
      issues.push({
        type: "LABEL_INCONSISTENT",
        isrc,
        values: labelValues as Record<MetadataSource, string>,
      });
    }

    const upcs = new Set(Object.values(upcValues));
    if (upcs.size > 1) {
      issues.push({
        type: "UPC_INCONSISTENT",
        isrc,
        values: upcValues as Record<MetadataSource, string>,
      });
    }
  }

  return issues;
}
