/**
 * Catalog completeness checks.
 *
 * Pure function — takes the loaded catalog as input, returns a structured
 * report of issues and a 0–100 health score. No DB access here so it can be
 * unit-tested and called from any context.
 */

export type CatalogArtistInput = {
  id: string;
  legalName: string;
  stageName: string | null;
  address: string | null;
  email: string | null;
  soundexchangeId: string | null;
  recordings: CatalogRecordingInput[];
};

export type CatalogRecordingInput = {
  id: string;
  isrc: string;
  title: string;
  label: string | null;
  upc: string | null;
  releaseDate: Date | string | null;
  splits: CatalogSplitInput[];
};

export type CatalogSplitInput = {
  participantName: string;
  role: string;
  percentage: number;
};

export type CatalogIssueSeverity = "warning" | "error";

export type CatalogIssue =
  | {
      type: "ARTIST_MISSING_CONTACT";
      severity: CatalogIssueSeverity;
      artistId: string;
      artistName: string;
      missing: ("address" | "email")[];
    }
  | {
      type: "ARTIST_MISSING_SOUNDEXCHANGE_ID";
      severity: CatalogIssueSeverity;
      artistId: string;
      artistName: string;
    }
  | {
      type: "ARTIST_NO_RECORDINGS";
      severity: CatalogIssueSeverity;
      artistId: string;
      artistName: string;
    }
  | {
      type: "RECORDING_MISSING_METADATA";
      severity: CatalogIssueSeverity;
      artistId: string;
      artistName: string;
      recordingId: string;
      isrc: string;
      title: string;
      missing: ("label" | "upc" | "releaseDate")[];
    }
  | {
      type: "RECORDING_NO_SPLITS";
      severity: CatalogIssueSeverity;
      artistId: string;
      artistName: string;
      recordingId: string;
      isrc: string;
      title: string;
    }
  | {
      type: "RECORDING_SPLITS_NOT_100";
      severity: CatalogIssueSeverity;
      artistId: string;
      artistName: string;
      recordingId: string;
      isrc: string;
      title: string;
      total: number;
    }
  | {
      type: "RECORDING_NO_ARTIST_SPLIT";
      severity: CatalogIssueSeverity;
      artistId: string;
      artistName: string;
      recordingId: string;
      isrc: string;
      title: string;
    }
  | {
      type: "ARTIST_DUPLICATE_TITLE";
      severity: CatalogIssueSeverity;
      artistId: string;
      artistName: string;
      title: string;
      isrcs: string[];
    };

export type CatalogHealthReport = {
  score: number;
  totals: {
    artists: number;
    recordings: number;
    splits: number;
  };
  counts: {
    errors: number;
    warnings: number;
  };
  issues: CatalogIssue[];
};

const FLOAT_TOLERANCE = 0.0001;

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function computeCatalogHealth(artists: CatalogArtistInput[]): CatalogHealthReport {
  const issues: CatalogIssue[] = [];

  let recordingCount = 0;
  let splitCount = 0;

  for (const artist of artists) {
    // Artist contact
    const missingContact: ("address" | "email")[] = [];
    if (!artist.address) missingContact.push("address");
    if (!artist.email) missingContact.push("email");
    if (missingContact.length > 0) {
      issues.push({
        type: "ARTIST_MISSING_CONTACT",
        severity: "warning",
        artistId: artist.id,
        artistName: artist.legalName,
        missing: missingContact,
      });
    }

    // SoundExchange ID
    if (!artist.soundexchangeId) {
      issues.push({
        type: "ARTIST_MISSING_SOUNDEXCHANGE_ID",
        severity: "warning",
        artistId: artist.id,
        artistName: artist.legalName,
      });
    }

    // Empty artist
    if (artist.recordings.length === 0) {
      issues.push({
        type: "ARTIST_NO_RECORDINGS",
        severity: "warning",
        artistId: artist.id,
        artistName: artist.legalName,
      });
    }

    // Per-recording checks
    const titlesSeen = new Map<string, string[]>();
    for (const recording of artist.recordings) {
      recordingCount += 1;
      splitCount += recording.splits.length;

      // Missing metadata
      const missingMetadata: ("label" | "upc" | "releaseDate")[] = [];
      if (!recording.label) missingMetadata.push("label");
      if (!recording.upc) missingMetadata.push("upc");
      if (!recording.releaseDate) missingMetadata.push("releaseDate");
      if (missingMetadata.length > 0) {
        issues.push({
          type: "RECORDING_MISSING_METADATA",
          severity: "warning",
          artistId: artist.id,
          artistName: artist.legalName,
          recordingId: recording.id,
          isrc: recording.isrc,
          title: recording.title,
          missing: missingMetadata,
        });
      }

      // Splits
      if (recording.splits.length === 0) {
        issues.push({
          type: "RECORDING_NO_SPLITS",
          severity: "error",
          artistId: artist.id,
          artistName: artist.legalName,
          recordingId: recording.id,
          isrc: recording.isrc,
          title: recording.title,
        });
      } else {
        const total = recording.splits.reduce((s, x) => s + x.percentage, 0);
        if (Math.abs(total - 100) > FLOAT_TOLERANCE) {
          issues.push({
            type: "RECORDING_SPLITS_NOT_100",
            severity: "error",
            artistId: artist.id,
            artistName: artist.legalName,
            recordingId: recording.id,
            isrc: recording.isrc,
            title: recording.title,
            total,
          });
        }

        // Artist must appear as a split participant somewhere
        const artistKey = normalizeName(artist.legalName);
        const stageKey = artist.stageName ? normalizeName(artist.stageName) : null;
        const hasArtistSplit = recording.splits.some((s) => {
          const k = normalizeName(s.participantName);
          return k === artistKey || (stageKey && k === stageKey);
        });
        if (!hasArtistSplit) {
          issues.push({
            type: "RECORDING_NO_ARTIST_SPLIT",
            severity: "warning",
            artistId: artist.id,
            artistName: artist.legalName,
            recordingId: recording.id,
            isrc: recording.isrc,
            title: recording.title,
          });
        }
      }

      // Duplicate title within an artist
      const titleKey = normalizeName(recording.title);
      if (!titlesSeen.has(titleKey)) titlesSeen.set(titleKey, []);
      titlesSeen.get(titleKey)!.push(recording.isrc);
    }

    for (const [titleKey, isrcs] of titlesSeen.entries()) {
      if (isrcs.length > 1) {
        const original = artist.recordings.find(
          (r) => normalizeName(r.title) === titleKey
        );
        issues.push({
          type: "ARTIST_DUPLICATE_TITLE",
          severity: "warning",
          artistId: artist.id,
          artistName: artist.legalName,
          title: original?.title ?? titleKey,
          isrcs,
        });
      }
    }
  }

  // Score: start at 100, subtract per issue, clamp.
  let score = 100;
  for (const issue of issues) {
    score -= issue.severity === "error" ? 6 : 2;
  }
  score = Math.max(0, score);

  return {
    score,
    totals: {
      artists: artists.length,
      recordings: recordingCount,
      splits: splitCount,
    },
    counts: {
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
    },
    issues,
  };
}
