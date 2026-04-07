/**
 * Gap Analysis Engine
 * -------------------
 * Compare Spotify catalog against SoundExchange registrations.
 * Calculate missing royalties and generate recovery estimates.
 */

import type {
  GapAnalysisResult,
  GapAnalysisSummary,
  TrackGap,
  SoundExchangeExport,
  RoyaltyEstimate,
  EstimateConfidence,
} from "@/types/gapAnalysis";
import type { CatalogPreviewRow, ExportedCatalog } from "@/types/spotifyCatalog";

const DEBUG = process.env.SPOTIFY_DEBUG === "true";

/**
 * Parse a SoundExchange CSV export into a normalized set of ISRCs.
 * Handles common column name variations.
 */
export function parseSoundExchangeExport(csvText: string): SoundExchangeExport {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("SoundExchange CSV appears to be empty or invalid.");
  }

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

  // Find ISRC and title columns (flexible naming)
  const isrcIdx = headers.findIndex(
    (h) => h === "isrc" || h === "isrc code" || h === "isrccode"
  );
  const titleIdx = headers.findIndex((h) => h === "title" || h === "track title" || h === "song title");

  if (isrcIdx === -1) {
    throw new Error("Could not find ISRC column in SoundExchange export.");
  }

  const registeredIsrcs = new Set<string>();
  const registrationDetails = new Map<
    string,
    {
      id: string;
      title: string;
      registeredDate?: string;
      status: "active" | "pending" | "dispute";
    }
  >();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim());
    const isrc = normalizeIsrc(parts[isrcIdx] || "");
    const title = titleIdx >= 0 ? parts[titleIdx] || "" : "";

    if (isrc && isValidIsrc(isrc)) {
      registeredIsrcs.add(isrc);
      registrationDetails.set(isrc, {
        id: isrc,
        title,
        status: "active", // Default to active unless we see otherwise
      });
    }
  }

  return {
    registeredIsrcs,
    registrationDetails,
    totalCount: registeredIsrcs.size,
  };
}

/**
 * Normalize ISRC format: CC12D34567890
 */
function normalizeIsrc(value: string): string {
  if (!value) return "";
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

/**
 * Validate ISRC format: 2 letters + 3 chars + 7 digits
 */
function isValidIsrc(isrc: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc);
}

/**
 * Estimate royalty based on streams and registry.
 * Uses median rate of ~$0.003–0.005 per stream based on rights holder tier.
 */
function estimateRoyalty(streams: number): RoyaltyEstimate {
  const low = streams * 0.003; // Conservative: $0.003/stream
  const high = streams * 0.005; // Optimistic: $0.005/stream
  const median = (low + high) / 2;

  // Confidence decreases for very high or very low stream counts
  let confidence: EstimateConfidence = "high";
  if (streams < 100 || streams > 10_000_000) {
    confidence = "medium";
  }
  if (streams > 100_000_000) {
    confidence = "low";
  }

  return {
    estimatedStreams: streams,
    estimatedRoyaltyLow: low,
    estimatedRoyaltyHigh: high,
    estimatedRoyaltyMedian: median,
    confidence,
  };
}

/**
 * Estimate streaming numbers for a track based on:
 * - Decade of release (older = more potential plays)
 * - Popularity signals (explicit, featured artists)
 *
 * This is a heuristic model; real numbers would come from Spotify API.
 */
function estimateStreams(track: TrackGap): number {
  // Base estimate: tracks average 10k–100k streams
  let estimate = 50_000;

  // Release date impact: older tracks have more potential
  if (track.releaseDate) {
    const year = parseInt(track.releaseDate.split("-")[0], 10);
    const yearsOld = new Date().getFullYear() - year;
    if (yearsOld > 5) estimate *= 1.5; // Older tracks = more cumulative plays
    if (yearsOld > 10) estimate *= 2;
  }

  // Explicit tracks tend to perform differently (feature signal)
  if (track.explicit) estimate *= 1.1;

  // Featured artists signal (if multiple artists)
  const artistCount = (track.artistNames.match(/,/g) || []).length + 1;
  if (artistCount > 1) estimate *= 1.2;

  return Math.round(estimate);
}

/**
 * Compare Spotify catalog against SoundExchange export.
 * Returns gap analysis with missing, present, and mismatch tracks.
 */
export async function analyzeGaps(
  spotifyExport: ExportedCatalog,
  soundexchangeCsv: string
): Promise<GapAnalysisResult> {
  if (DEBUG) console.log("[GAP ANALYSIS] Starting comparison...");

  const soundexchange = parseSoundExchangeExport(soundexchangeCsv);
  if (DEBUG) console.log(`[GAP ANALYSIS] Found ${soundexchange.totalCount} registered ISRCs`);

  const gaps: TrackGap[] = [];
  let missingCount = 0;
  let presentCount = 0;
  let mismatchCount = 0;
  let totalEstimatedStreams = 0;
  let lowEstimate = 0;
  let highEstimate = 0;

  // Parse preview rows + missing rows to reconstruct full track data
  const allTracks = spotifyExport.previewRows.concat(spotifyExport.missingIsrcPreview || []);

  for (const previewRow of allTracks) {
    const gap: TrackGap = {
      isrc: previewRow.isrc || "",
      trackName: previewRow.trackName,
      artistNames: previewRow.artistNames,
      albumName: previewRow.albumName,
      releaseDate: previewRow.releaseDate || "",
      spotifyTrackId: "", // Not in preview, would need full export
      durationMs: 0,
      explicit: false,
      status: "missing",
    };

    if (!gap.isrc) {
      // Track without ISRC is flagged as "missing" with a reason
      gap.status = "missing";
      gap.missingReason = "No ISRC metadata available on Spotify";
      mismatchCount++;
      gaps.push(gap);
      continue;
    }

    const isRegistered = soundexchange.registeredIsrcs.has(gap.isrc);

    if (isRegistered) {
      gap.status = "present";
      presentCount++;
      const registration = soundexchange.registrationDetails.get(gap.isrc);
      if (registration) {
        gap.soundexchangeId = registration.id;
      }
    } else {
      gap.status = "missing";
      gap.missingReason = "Not registered with SoundExchange";
      missingCount++;

      // Estimate potential royalties for missing tracks
      const streams = estimateStreams(gap);
      const royalty = estimateRoyalty(streams);

      gap.estimatedAnnualStreams = royalty.estimatedStreams;
      gap.estimatedAnnualRoyalty = royalty.estimatedRoyaltyMedian;
      gap.estimateConfidence = royalty.confidence;

      totalEstimatedStreams += royalty.estimatedStreams;
      lowEstimate += royalty.estimatedRoyaltyLow;
      highEstimate += royalty.estimatedRoyaltyHigh;
    }

    gaps.push(gap);
  }

  // Determine recovery priority
  let recoveryPriority: "critical" | "high" | "medium" | "low" = "medium";
  const missingPercent = spotifyExport.tracksFound > 0 ? (missingCount / spotifyExport.tracksFound) * 100 : 0;

  if (missingPercent > 50) {
    recoveryPriority = "critical"; // More than half missing
  } else if (missingPercent > 25) {
    recoveryPriority = "high"; // More than quarter missing
  } else if (missingPercent > 10) {
    recoveryPriority = "medium";
  } else {
    recoveryPriority = "low";
  }

  const summary: GapAnalysisSummary = {
    catalogName: spotifyExport.catalogName,
    totalTracks: spotifyExport.tracksFound,
    missingCount,
    missingPercent: parseFloat(missingPercent.toFixed(1)),
    presentCount,
    mismatchCount,
    estimatedMissingRoyaltiesLow: parseFloat(lowEstimate.toFixed(2)),
    estimatedMissingRoyaltiesHigh: parseFloat(highEstimate.toFixed(2)),
    estimatedTotalStreams: totalEstimatedStreams,
    recoveryPriority,
  };

  const result: GapAnalysisResult = {
    summary,
    gaps,
    missingTracks: gaps.filter((g) => g.status === "missing"),
    presentTracks: gaps.filter((g) => g.status === "present"),
    mismatchTracks: gaps.filter((g) => g.status === "mismatch"),
    generatedAt: new Date().toISOString(),
    soundexchangeMetadata: {
      totalRegistrations: soundexchange.totalCount,
    },
  };

  if (DEBUG) {
    console.log(`[GAP ANALYSIS] Summary:`, {
      missing: missingCount,
      present: presentCount,
      estimatedRoyalties: `$${lowEstimate.toFixed(2)} - $${highEstimate.toFixed(2)}`,
    });
  }

  return result;
}

/**
 * Generate a human-friendly summary of gap analysis for UI display
 */
export function generateGapSummaryText(result: GapAnalysisResult): string {
  const { summary } = result;
  const lines: string[] = [];

  lines.push(`## Royalty Recovery Report: ${summary.catalogName}`);
  lines.push("");
  lines.push(`**Catalog Analysis:**`);
  lines.push(`- Total Tracks: ${summary.totalTracks}`);
  lines.push(`- Registered: ${summary.presentCount} (${((summary.presentCount / summary.totalTracks) * 100).toFixed(1)}%)`);
  lines.push(`- Missing: ${summary.missingCount} (${summary.missingPercent}%)`);
  lines.push("");

  lines.push(`**Revenue Impact:**`);
  lines.push(`- Estimated Missing Royalties: **$${summary.estimatedMissingRoyaltiesLow.toFixed(2)} – $${summary.estimatedMissingRoyaltiesHigh.toFixed(2)}** annually`);
  lines.push(`- Estimated Streams: ${summary.estimatedTotalStreams.toLocaleString()}`);
  lines.push("");

  lines.push(`**Recovery Priority: ${summary.recoveryPriority.toUpperCase()}`);

  if (summary.recoveryPriority === "critical") {
    lines.push(`⚠️ You're missing royalties on ${summary.missingPercent}% of your catalog. This requires immediate action.`);
  } else if (summary.recoveryPriority === "high") {
    lines.push(`⚠️ Significant opportunity: ${summary.missingPercent}% of your catalog is unregistered.`);
  }

  return lines.join("\n");
}
