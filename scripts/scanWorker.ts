import { prisma } from "../lib/db";
import type { RoyaltyTrack } from "../lib/royalty/types";
import { getArtist, getArtistAlbums, getAlbumTracks } from "../lib/spotifyClient";
import { analyzeMetadataIntegrity } from "../lib/royalty/metadataIntegrity";
import { analyzeRegistrationCoverage } from "../lib/royalty/registrationCoverage";
import { getPlaybackSignals } from "../lib/royalty/playbackSignals";
import { getTrackAgeBucket } from "../lib/royalty/catalogAge";
import { getRoyaltySignal } from "../lib/royalty/probabilityEngine";
import { estimateEscrow } from "../lib/royalty/escrowEstimator";

function readPositiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const POLL_INTERVAL_MS = 3000;
const MAX_ALBUMS_PER_SCAN = 20;
const MAX_TRACKS_PER_SCAN = 800;
const COMPLETE_SCAN_RETENTION_MS =
  readPositiveNumber("SCAN_COMPLETE_RETENTION_DAYS", 7) * 24 * 60 * 60 * 1000;
const FAILED_SCAN_RETENTION_MS =
  readPositiveNumber("SCAN_FAILED_RETENTION_DAYS", 3) * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS =
  readPositiveNumber("SCAN_CLEANUP_INTERVAL_MINUTES", 60) * 60 * 1000;

let lastCleanupAt = 0;

async function updateScan(scanId: string, data: any) {
  await prisma.royaltyScan.update({ where: { id: scanId }, data });
}

async function cleanupExpiredScans() {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;

  const completeBefore = new Date(now - COMPLETE_SCAN_RETENTION_MS);
  const failedBefore = new Date(now - FAILED_SCAN_RETENTION_MS);

  const deletedComplete = await prisma.royaltyScan.deleteMany({
    where: {
      status: "complete",
      updatedAt: { lt: completeBefore },
    },
  });

  const deletedFailed = await prisma.royaltyScan.deleteMany({
    where: {
      status: "failed",
      updatedAt: { lt: failedBefore },
    },
  });

  if (deletedComplete.count || deletedFailed.count) {
    console.log(
      `Cleaned up ${deletedComplete.count} complete scans and ${deletedFailed.count} failed scans`
    );
  }
}

async function processNextScan() {
  const pending = await prisma.royaltyScan.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  if (!pending) return false;

  // Claim this job; if another worker claimed first, skip.
  const claimed = await prisma.royaltyScan.updateMany({
    where: { id: pending.id, status: "pending" },
    data: {
      status: "processing",
      progress: 5,
      message: "Fetching catalog",
      error: null,
    },
  });

  if (claimed.count === 0) return true;

  try {
    const now = new Date();
    const artist = await getArtist(pending.artistId);

    const albumsRes = await getArtistAlbums(pending.artistId);
    const albums = (albumsRes.items ?? []).slice(0, MAX_ALBUMS_PER_SCAN);
    const rawTracks: RoyaltyTrack[] = [];
    let partialScan = false;

    for (let i = 0; i < albums.length; i += 1) {
      if (rawTracks.length >= MAX_TRACKS_PER_SCAN) {
        partialScan = true;
        break;
      }

      const album = albums[i];
      const progress = 8 + Math.round(((i + 1) / Math.max(1, albums.length)) * 22);
      await updateScan(pending.id, {
        progress,
        message: `Fetching catalog (${i + 1}/${albums.length} albums)`,
      });

      const albumTracksRes = await getAlbumTracks(album.id);
      for (const t of albumTracksRes.items ?? []) {
        if (rawTracks.length >= MAX_TRACKS_PER_SCAN) {
          partialScan = true;
          break;
        }

        rawTracks.push({
          track_id: t.id,
          track_name: t.name,
          isrc: t.external_ids?.isrc ?? null,
          album_id: album.id,
          album_name: album.name,
          release_date: album.release_date ?? null,
          popularity: t.popularity ?? artist.popularity ?? 0,
          registered: null,
        });
      }
    }

    if (rawTracks.length === 0) {
      throw new Error("No tracks found for this artist.");
    }

    await updateScan(pending.id, { progress: 40, message: "Normalizing metadata" });

    const titleCounts = new Map<string, number>();
    for (const t of rawTracks) {
      const key = t.track_name.toLowerCase().trim();
      titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
    }

    await updateScan(pending.id, { progress: 55, message: "Analyzing metadata integrity" });
    const metadataIntegrity = analyzeMetadataIntegrity(rawTracks);

    await updateScan(pending.id, { progress: 65, message: "Computing playback signals" });

    const signalsByTrack = new Map<string, ReturnType<typeof getRoyaltySignal>>();
    const playbackByTrack = new Map<string, "low" | "medium" | "high">();
    const ageByTrack = new Map<string, "new" | "developing" | "established" | "legacy">();

    const enrichedTracks = rawTracks.map((t) => {
      const playbackSignals = getPlaybackSignals(t, now);
      const ageBucket = getTrackAgeBucket(t, now);
      const royaltySignal = getRoyaltySignal(t, playbackSignals, ageBucket);

      signalsByTrack.set(t.track_id, royaltySignal);
      playbackByTrack.set(t.track_id, playbackSignals.level);
      ageByTrack.set(t.track_id, ageBucket);

      return {
        track_id: t.track_id,
        track_name: t.track_name,
        isrc: t.isrc,
        album_id: t.album_id,
        album_name: t.album_name,
        release_date: t.release_date,
        popularity: t.popularity,
        age_bucket: ageBucket,
        playback_signals: playbackSignals,
        royalty_signal: royaltySignal,
        metadata_flags: {
          missing_isrc: !t.isrc,
          missing_release_date: !t.release_date,
          duplicate_title: (titleCounts.get(t.track_name.toLowerCase().trim()) ?? 0) > 1,
        },
      };
    });

    await updateScan(pending.id, { progress: 75, message: "Computing royalty probability" });

    const elevated = enrichedTracks.filter((t) => t.royalty_signal.tier === "elevated").length;
    const emerging = enrichedTracks.filter((t) => t.royalty_signal.tier === "emerging").length;
    const low = enrichedTracks.filter((t) => t.royalty_signal.tier === "low").length;
    const confidenceScore = Math.round(
      enrichedTracks.reduce((sum, t) => sum + t.royalty_signal.score, 0) / enrichedTracks.length
    );

    await updateScan(pending.id, { progress: 85, message: "Estimating escrow" });

    const registrationCoverage = analyzeRegistrationCoverage(rawTracks);
    const escrow = estimateEscrow(rawTracks, signalsByTrack, playbackByTrack, ageByTrack);
    const metadataIssues = enrichedTracks.filter(
      (t) =>
        t.metadata_flags.missing_isrc ||
        t.metadata_flags.missing_release_date ||
        t.metadata_flags.duplicate_title
    ).length;
    const missingFromSoundexchange = Math.max(0, rawTracks.length - registrationCoverage.registeredCount);
    const confidenceLabel =
      confidenceScore >= 81
        ? "ACTIVE REVENUE LOSS"
        : confidenceScore >= 61
        ? "High probability"
        : confidenceScore >= 31
        ? "Medium leakage"
        : "Low risk";
    const valueRangeConfidence: "low" | "medium" | "high" =
      metadataIntegrity.missingIsrcCount === 0
        ? "high"
        : metadataIntegrity.missingIsrcCount < rawTracks.length * 0.3
        ? "medium"
        : "low";
    const insightSummary =
      confidenceScore >= 61
        ? "High probability of unclaimed royalties detected from registration and metadata gaps."
        : confidenceScore >= 31
        ? "Medium leakage risk detected. Review flagged tracks to prevent missed royalties."
        : "Low immediate leakage risk based on currently available catalog data.";

    const resultJson = {
      source: "spotify",
      generated_at: now.toISOString(),
      artist: {
        id: artist.id,
        name: artist.name,
        genres: artist.genres ?? [],
        popularity: artist.popularity ?? null,
      },
      summary: {
        total_tracks: rawTracks.length,
        missing_isrcs: metadataIntegrity.missingIsrcCount,
        metadata_integrity_score: metadataIntegrity.score,
        registration_coverage_percent: registrationCoverage.coveragePercent,
        royalty_confidence_score: confidenceScore,
        royalty_confidence_label: confidenceLabel,
        royalty_signal_distribution: { elevated, emerging, low },
        gap_breakdown: {
          missing_from_soundexchange: missingFromSoundexchange,
          metadata_issues: metadataIssues,
          fully_registered: registrationCoverage.registeredCount,
        },
        estimated_value_range_usd: {
          low: escrow.estimatedLowUsd,
          high: escrow.estimatedHighUsd,
          confidence: valueRangeConfidence,
        },
        insight_summary: insightSummary,
        scan_context: {
          albums_scanned: albums.length,
          tracks_scanned: rawTracks.length,
          partial_scan: partialScan,
        },
      },
      tracks: enrichedTracks,
      methodology: {
        description: "Analysis is based on publicly available metadata and inferred activity signals.",
        limitations: [
          "Does not include direct reporting data from rights organizations",
          "Does not confirm existence of payable royalties",
          "Estimates are illustrative and not financial statements",
          "Large catalogs may be analyzed as a bounded partial scan for responsiveness",
        ],
      },
    };

    await updateScan(pending.id, {
      status: "complete",
      progress: 100,
      message: "Scan complete",
      resultJson,
      error: null,
    });

    console.log(`Scan ${pending.id} complete`);
  } catch (error: any) {
    await updateScan(pending.id, {
      status: "failed",
      message: "Scan failed",
      error: error?.message ?? "Unknown error",
    });
    console.error(`Scan ${pending.id} failed`, error);
  }

  return true;
}

async function main() {
  console.log("VerseIQ scan worker started");
  while (true) {
    await cleanupExpiredScans();
    const handled = await processNextScan();
    if (!handled) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

main().catch((error) => {
  console.error("Worker fatal error", error);
  process.exit(1);
});