import { prisma } from "../lib/db";
import type { RoyaltyTrack } from "../lib/royalty/types";
import { getArtist, getArtistAlbumsPage, getAlbumTracks } from "../lib/spotifyClient";
import { analyzeMetadataIntegrity } from "../lib/royalty/metadataIntegrity";
import { analyzeRegistrationCoverage } from "../lib/royalty/registrationCoverage";
import { getPlaybackSignals } from "../lib/royalty/playbackSignals";
import { getTrackAgeBucket } from "../lib/royalty/catalogAge";
import { getRoyaltySignal } from "../lib/royalty/probabilityEngine";
import { estimateEscrow } from "../lib/royalty/escrowEstimator";

const POLL_INTERVAL_MS = 3000;
const MAX_ALBUMS_PER_SCAN = 20;
const MAX_TRACKS_PER_SCAN = 800;

async function updateScan(scanId: string, data: any) {
  await prisma.royaltyScan.update({ where: { id: scanId }, data });
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

    const albumsRes = await getArtistAlbumsPage(pending.artistId, 0, MAX_ALBUMS_PER_SCAN);
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

    const resultJson = {
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
        royalty_signal_distribution: { elevated, emerging, low },
        estimated_value_range_usd: {
          low: escrow.estimatedLowUsd,
          high: escrow.estimatedHighUsd,
        },
        scan_context: {
          albums_scanned: albums.length,
          tracks_scanned: rawTracks.length,
          partial_scan: partialScan,
        },
      },
      tracks: enrichedTracks,
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