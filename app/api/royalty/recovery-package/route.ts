import { NextRequest, NextResponse } from "next/server";
import { getArtist, getArtistAlbumsPage, getAlbumTracks } from "@/lib/spotifyClient";
import { getCached, setCached, withRetry } from "@/lib/royalty/spotifyCache";
import type { RoyaltyTrack } from "@/lib/royalty/types";
import { getPlaybackSignals } from "@/lib/royalty/playbackSignals";
import { getTrackAgeBucket } from "@/lib/royalty/catalogAge";
import { getRoyaltySignal } from "@/lib/royalty/probabilityEngine";
import { analyzeMetadataIntegrity } from "@/lib/royalty/metadataIntegrity";
import { analyzeRegistrationCoverage } from "@/lib/royalty/registrationCoverage";
import { buildAlternativeCatalog } from "@/lib/royalty/alternativeProviders";

const MAX_ALBUMS_PER_SCAN = 20;
const MAX_TRACKS_PER_SCAN = 800;

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get("artistId");
  const artistName = req.nextUrl.searchParams.get("artistName")?.trim() || "";
  if (!artistId && !artistName) {
    return NextResponse.json({ error: "artistId or artistName required" }, { status: 400 });
  }

  const cacheKey = `recovery-package:${artistId ?? "none"}:${artistName || "none"}`;
  const cached = getCached<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const result = await withRetry(async () => {
      const now = new Date();
      const rawTracks: RoyaltyTrack[] = [];
      let trackCapReached = false;
      let artist: { id: string; name: string } = { id: artistId || `alt:${artistName}`, name: artistName || "Unknown Artist" };
      let source = "spotify";
      let providerStats: { deezerTracks?: number; musicbrainzTracks?: number; discogsTracks?: number } = {};

      if (artistId) {
        try {
          const spotifyArtist = await getArtist(artistId);
          artist = { id: spotifyArtist.id, name: spotifyArtist.name };

          const albumsRes = await getArtistAlbumsPage(artistId, 0, MAX_ALBUMS_PER_SCAN);
          const albums = (albumsRes.items ?? []).slice(0, MAX_ALBUMS_PER_SCAN);

          for (const album of albums) {
            if (rawTracks.length >= MAX_TRACKS_PER_SCAN) {
              trackCapReached = true;
              break;
            }

            await new Promise((r) => setTimeout(r, 100));
            const albumTracksRes = await getAlbumTracks(album.id);
            for (const t of albumTracksRes.items ?? []) {
              if (rawTracks.length >= MAX_TRACKS_PER_SCAN) {
                trackCapReached = true;
                break;
              }

              rawTracks.push({
                track_id: t.id,
                track_name: t.name,
                isrc: t.external_ids?.isrc ?? null,
                album_id: album.id,
                album_name: album.name,
                release_date: album.release_date ?? null,
                popularity: t.popularity ?? spotifyArtist.popularity ?? 0,
              });
            }
          }
        } catch (spotifyErr) {
          // If Spotify is unavailable, fall back to alternative metadata providers.
          if (!artistName) {
            throw new Error(
              "Spotify unavailable for this artistId. Add artistName query parameter to use alternative providers (MusicBrainz/Deezer/Discogs)."
            );
          }

          const alt = await buildAlternativeCatalog(artistName);
          source = "alternatives";
          artist = alt.artist;
          rawTracks.push(...alt.tracks);
          providerStats = alt.providerStats;
        }
      } else {
        const alt = await buildAlternativeCatalog(artistName);
        source = "alternatives";
        artist = alt.artist;
        rawTracks.push(...alt.tracks.slice(0, MAX_TRACKS_PER_SCAN));
        trackCapReached = alt.tracks.length > MAX_TRACKS_PER_SCAN;
        providerStats = alt.providerStats;
      }

      if (rawTracks.length === 0) {
        throw new Error("No tracks found from available providers for this query.");
      }

      // Aggregate analysis
      const metadataIntegrity = analyzeMetadataIntegrity(rawTracks);
      const registrationCoverage = analyzeRegistrationCoverage(rawTracks);

      // Duplicate title lookup for per-track flags
      const titleCounts = new Map<string, number>();
      for (const t of rawTracks) {
        const key = t.track_name.toLowerCase().trim();
        titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
      }

      // Per-track enrichment
      const enrichedTracks = rawTracks.map((t) => {
        const playbackSignals = getPlaybackSignals(t, now);
        const ageBucket = getTrackAgeBucket(t, now);
        const royaltySignal = getRoyaltySignal(t, playbackSignals, ageBucket);
        const dupCount = titleCounts.get(t.track_name.toLowerCase().trim()) ?? 0;

        return {
          track_id: t.track_id,
          track_name: t.track_name,
          isrc: t.isrc,
          album_id: t.album_id,
          album_name: t.album_name,
          release_date: t.release_date,
          popularity: t.popularity,
          playback_signals: playbackSignals,
          royalty_signal: royaltySignal,
          metadata_flags: {
            missing_isrc: !t.isrc,
            missing_release_date: !t.release_date,
            duplicate_title: dupCount > 1,
          },
        };
      });

      // Signal distribution
      const elevated = enrichedTracks.filter((t) => t.royalty_signal.tier === "elevated").length;
      const emerging = enrichedTracks.filter((t) => t.royalty_signal.tier === "emerging").length;
      const low = enrichedTracks.filter((t) => t.royalty_signal.tier === "low").length;

      // Value range (directional, illustrative)
      const valueRangeConfidence: "low" | "medium" | "high" =
        metadataIntegrity.missingIsrcCount === 0
          ? "high"
          : metadataIntegrity.missingIsrcCount < rawTracks.length * 0.3
          ? "medium"
          : "low";

      // Insight summary
      const insightSummary =
        elevated > 0
          ? `${elevated} track${elevated === 1 ? "" : "s"} show elevated signals that may indicate gaps in rights recognition. Metadata integrity score: ${metadataIntegrity.score}/100.`
          : emerging > 0
          ? `${emerging} track${emerging === 1 ? "" : "s"} show emerging signals worth reviewing. Metadata integrity score: ${metadataIntegrity.score}/100.`
          : `No elevated signals detected. Metadata integrity score: ${metadataIntegrity.score}/100.`;

      return {
        source,
        generated_at: now.toISOString(),
        artist: { id: artist.id, name: artist.name },
        summary: {
          total_tracks: rawTracks.length,
          missing_isrcs: metadataIntegrity.missingIsrcCount,
          metadata_integrity_score: metadataIntegrity.score,
          registration_coverage_percent: registrationCoverage.coveragePercent,
          royalty_signal_distribution: { elevated, emerging, low },
          estimated_value_range_usd: {
            low: elevated * 50,
            high: elevated * 200,
            confidence: valueRangeConfidence,
          },
          insight_summary: insightSummary,
          scan_context: {
            albums_scanned: null,
            tracks_scanned: rawTracks.length,
            partial_scan: trackCapReached,
            provider_stats: providerStats,
          },
        },
        tracks: enrichedTracks,
        methodology: {
          description:
            "Analysis is based on publicly available metadata and inferred activity signals.",
          limitations: [
            "Does not include direct reporting data from rights organizations",
            "Does not confirm existence of payable royalties",
            "Estimates are illustrative and not financial statements",
            "Large catalogs may be analyzed as a bounded partial scan for responsiveness",
          ],
        },
      };
    }, 0);

    setCached(cacheKey, result);
    return NextResponse.json(result);
  } catch (e: any) {
    const msg = e?.message ?? "unknown";
    const status = String(msg).includes("429") ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

