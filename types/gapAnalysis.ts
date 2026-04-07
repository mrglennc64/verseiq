/**
 * Gap Analysis Types
 * ------------------
 * Types for comparing Spotify catalog against SoundExchange + PRO registrations.
 * Enables royalty recovery calculations and financial impact assessment.
 */

export type GapStatus = "missing" | "present" | "mismatch";
export type EstimateConfidence = "high" | "medium" | "low";

/** Single track comparison status */
export interface TrackGap {
  /** Spotify ISRC (canonical identifier) */
  isrc: string;
  /** Song name from Spotify */
  trackName: string;
  /** Artist names from Spotify */
  artistNames: string;
  /** Album name from Spotify */
  albumName: string;
  /** Release date from Spotify */
  releaseDate: string;
  /** Spotify track ID */
  spotifyTrackId: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Is track marked explicit? */
  explicit: boolean;

  /** Status: missing from SoundExchange, present, or metadata mismatch */
  status: GapStatus;
  /** Why is it missing? (for diagnostics) */
  missingReason?: string;
  /** SoundExchange registration ID (if registered) */
  soundexchangeId?: string;

  /** Estimated annual streams (based on comparable tracks) */
  estimatedAnnualStreams?: number;
  /** Estimated annual royalty at ~$0.003-0.005 per stream */
  estimatedAnnualRoyalty?: number;
  /** Confidence level for estimate */
  estimateConfidence?: EstimateConfidence;
}

/** Summary statistics for gap analysis */
export interface GapAnalysisSummary {
  /** Source catalog name (artist or playlist) */
  catalogName: string;
  /** Total unique ISRCs exported from Spotify */
  totalTracks: number;
  /** Tracks missing in SoundExchange */
  missingCount: number;
  /** Percentage missing */
  missingPercent: number;
  /** Tracks present in SoundExchange */
  presentCount: number;
  /** Tracks with ISRC metadata issues */
  mismatchCount: number;

  /** Total estimated missing annual royalties */
  estimatedMissingRoyaltiesLow: number; // $0.003/stream
  estimatedMissingRoyaltiesHigh: number; // $0.005/stream

  /** Aggregated streams (where confident) */
  estimatedTotalStreams: number;

  /** Revenue recovery potential */
  recoveryPriority: "critical" | "high" | "medium" | "low";
}

/** Complete gap analysis result */
export interface GapAnalysisResult {
  summary: GapAnalysisSummary;
  gaps: TrackGap[];
  missingTracks: TrackGap[];
  presentTracks: TrackGap[];
  mismatchTracks: TrackGap[];

  /** Generated at timestamp */
  generatedAt: string;
  /** User SoundExchange export metadata */
  soundexchangeMetadata?: {
    totalRegistrations: number;
    lastSyncDate?: string;
  };
}

/** User SoundExchange export data */
export interface SoundExchangeExport {
  /** List of ISRCs registered with SoundExchange */
  registeredIsrcs: Set<string>;
  /** Map of ISRC → registration details (if available) */
  registrationDetails: Map<
    string,
    {
      id: string;
      title: string;
      registeredDate?: string;
      status: "active" | "pending" | "dispute";
    }
  >;
  /** Total registrations in export */
  totalCount: number;
}

/** Royalty estimate based on streaming data */
export interface RoyaltyEstimate {
  /** Annual streams estimate */
  estimatedStreams: number;
  /** Low estimate: $0.003/stream */
  estimatedRoyaltyLow: number;
  /** High estimate: $0.005/stream */
  estimatedRoyaltyHigh: number;
  /** Median estimate: $0.004/stream */
  estimatedRoyaltyMedian: number;
  /** Confidence level */
  confidence: EstimateConfidence;
}
