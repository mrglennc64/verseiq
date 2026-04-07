"use server";

/**
 * Royalty Recovery Workflow
 * -------------------------
 * Server action that orchestrates:
 * 1. Spotify catalog export (artist or playlist)
 * 2. SoundExchange comparison (gap analysis)
 * 3. Royalty estimation
 * 4. Recovery recommendations
 */

import { exportSpotifyCatalogCsv } from "@/lib/exportSpotifyCatalog";
import { analyzeGaps, generateGapSummaryText } from "@/lib/gapAnalysisEngine";
import type { GapAnalysisResult } from "@/types/gapAnalysis";
import type { ExportedCatalog } from "@/types/spotifyCatalog";

const DEBUG = process.env.SPOTIFY_DEBUG === "true";
const SPOTIFY_TOKEN = process.env.SPOTIFY_TOKEN;

interface RoyaltyRecoveryWorkflowInput {
  /** Spotify artist URL or playlist URL */
  spotifyInput: string;
  /** SoundExchange CSV export (optional) */
  soundexchangeCsv?: string;
}

interface RoyaltyRecoveryWorkflowResult {
  status: "success" | "error" | "preview";
  error?: string;

  // Spotify export data
  spotifyExport?: ExportedCatalog;

  // Gap analysis (if SoundExchange provided)
  gapAnalysis?: GapAnalysisResult;
  gapSummaryText?: string;

  // User-friendly messages
  steps: string[];
  next?: string;
}

/**
 * Step 1: Export from Spotify
 * Returns catalog with metadata + preview rows
 */
async function step_exportSpotify(spotifyInput: string): Promise<ExportedCatalog> {
  if (!SPOTIFY_TOKEN) {
    throw new Error("SPOTIFY_TOKEN not configured in environment.");
  }

  if (DEBUG) console.log("[WORKFLOW] Step 1: Exporting from Spotify...");

  return exportSpotifyCatalogCsv(SPOTIFY_TOKEN, spotifyInput);
}

/**
 * Step 2: Analyze gaps (if SoundExchange CSV provided)
 * Returns detailed gap analysis with royalty estimates
 */
async function step_analyzeGaps(
  spotifyExport: ExportedCatalog,
  soundexchangeCsv: string
): Promise<GapAnalysisResult> {
  if (DEBUG) console.log("[WORKFLOW] Step 2: Analyzing gaps...");

  return analyzeGaps(spotifyExport, soundexchangeCsv);
}

/**
 * Main royalty recovery workflow
 * Orchestrates Spotify export → gap analysis → recommendations
 */
export async function executeRoyaltyRecoveryWorkflow(
  input: RoyaltyRecoveryWorkflowInput
): Promise<RoyaltyRecoveryWorkflowResult> {
  const steps: string[] = [];
  const debug = DEBUG || process.env.DEBUG_WORKFLOW === "true";

  try {
    // ============================================
    // STEP 1: EXPORT FROM SPOTIFY
    // ============================================
    steps.push("📊 Connecting to Spotify...");

    const spotifyExport = await step_exportSpotify(input.spotifyInput);
    steps.push(
      `✅ Found ${spotifyExport.tracksFound} tracks (${spotifyExport.tracksWithIsrc} with ISRC)`
    );

    if (debug) {
      console.log("[WORKFLOW] Spotify export:", {
        source: spotifyExport.sourceType,
        tracks: spotifyExport.tracksFound,
        isrcCount: spotifyExport.tracksWithIsrc,
        missingIsrc: spotifyExport.tracksMissingIsrc,
      });
    }

    // Early return: preview mode (no SoundExchange comparison yet)
    if (!input.soundexchangeCsv) {
      steps.push("⏸️ Ready for gap analysis (upload SoundExchange export to compare)");

      return {
        status: "preview",
        spotifyExport,
        steps,
        next: "upload-soundexchange",
      };
    }

    // ============================================
    // STEP 2: ANALYZE GAPS (vs SoundExchange)
    // ============================================
    steps.push("🔍 Comparing against SoundExchange registrations...");

    const gapAnalysis = await step_analyzeGaps(spotifyExport, input.soundexchangeCsv);
    const { summary } = gapAnalysis;

    steps.push(
      `📈 Gap analysis complete: ${summary.missingCount} tracks missing (${summary.missingPercent}%)`
    );
    steps.push(
      `💰 Estimated missing royalties: $${summary.estimatedMissingRoyaltiesLow.toFixed(2)} – $${summary.estimatedMissingRoyaltiesHigh.toFixed(2)}/year`
    );

    if (debug) {
      console.log("[WORKFLOW] Gap analysis:", {
        missing: summary.missingCount,
        present: summary.presentCount,
        recoveryPriority: summary.recoveryPriority,
        estimatedRoyalties: `$${summary.estimatedMissingRoyaltiesLow} - $${summary.estimatedMissingRoyaltiesHigh}`,
      });
    }

    // ============================================
    // STEP 3: RECOMMENDATIONS
    // ============================================
    let recommendationStep = "";

    switch (summary.recoveryPriority) {
      case "critical":
        recommendationStep =
          "🚨 CRITICAL: Start registering missing tracks immediately. Each week of delay costs you money.";
        break;
      case "high":
        recommendationStep = "⚠️ HIGH PRIORITY: Register these tracks within 30 days to recover royalties.";
        break;
      case "medium":
        recommendationStep = "📋 Plan: Batch register these tracks with SoundExchange.";
        break;
      case "low":
        recommendationStep = "✅ Your catalog is well-registered. Review occasionally for new releases.";
        break;
    }

    steps.push(recommendationStep);

    const gapSummaryText = generateGapSummaryText(gapAnalysis);

    return {
      status: "success",
      spotifyExport,
      gapAnalysis,
      gapSummaryText,
      steps,
      next: "download-report",
    };
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

    if (debug) {
      console.error("[WORKFLOW] Error:", error);
    }

    return {
      status: "error",
      error: message,
      steps,
    };
  }
}

/**
 * Alternative: Just export without gap analysis
 * (Simpler, for users who don't have SoundExchange data yet)
 */
export async function exportSpotifyCatalogAction(spotifyInput: string): Promise<ExportedCatalog> {
  if (!SPOTIFY_TOKEN) {
    throw new Error("SPOTIFY_TOKEN not configured");
  }

  return exportSpotifyCatalogCsv(SPOTIFY_TOKEN, spotifyInput);
}

/**
 * Standalone gap analysis action
 * (For users who already have their Spotify CSV + SoundExchange CSV)
 */
export async function analyzeRoyaltyGapsAction(
  spotifyInput: string,
  soundexchangeCsv: string
): Promise<GapAnalysisResult> {
  if (!SPOTIFY_TOKEN) {
    throw new Error("SPOTIFY_TOKEN not configured");
  }

  const spotifyExport = await exportSpotifyCatalogCsv(SPOTIFY_TOKEN, spotifyInput);
  return analyzeGaps(spotifyExport, soundexchangeCsv);
}
