"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RoyaltyHealthCard } from "../components/RoyaltyHealthCard";

type ConfidenceLevel = "low" | "medium" | "high";
type SignalTier = "low" | "emerging" | "elevated";

type EnrichedTrack = {
  track_id: string;
  track_name: string;
  isrc: string | null;
  album_name: string;
  release_date: string | null;
  popularity?: number;
  playback_signals: { level: "low" | "medium" | "high"; indicators: string[] };
  royalty_signal: {
    score: number;
    tier: SignalTier;
    confidence: ConfidenceLevel;
    reasons: string[];
    message: string;
  };
  metadata_flags: {
    missing_isrc: boolean;
    missing_release_date: boolean;
    duplicate_title: boolean;
  };
};

type RecoveryPackage = {
  source: string;
  generated_at: string;
  artist: { id: string; name: string };
  summary: {
    total_tracks: number;
    missing_isrcs: number;
    metadata_integrity_score: number;
    registration_coverage_percent: number;
    royalty_signal_distribution: { elevated: number; emerging: number; low: number };
    estimated_value_range_usd: { low: number; high: number; confidence: ConfidenceLevel };
    insight_summary: string;
  };
  tracks: EnrichedTrack[];
  methodology: { description: string; limitations: string[] };
};

function RoyaltyRecoveryDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const artistId = searchParams.get("artistId") || "";
  const artistName = searchParams.get("artistName") || "";
  const [inputArtistId, setInputArtistId] = useState(artistId);
  const [inputArtistName, setInputArtistName] = useState(artistName);

  const [data, setData] = useState<RecoveryPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputArtistId(artistId);
    setInputArtistName(artistName);
  }, [artistId, artistName]);

  function runScan() {
    const nextArtistId = inputArtistId.trim();
    const nextArtistName = inputArtistName.trim();
    if (!nextArtistId && !nextArtistName) {
      setError("Enter artist name or artist ID to run analysis.");
      return;
    }

    const params = new URLSearchParams();
    if (nextArtistId) params.set("artistId", nextArtistId);
    if (nextArtistName) params.set("artistName", nextArtistName);

    setError(null);
    setData(null);
    setLoading(true);
    router.push(`${pathname}?${params.toString()}`);
  }

  function LauncherPanel() {
    return (
      <section className="max-w-6xl mx-auto mb-10">
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5">
          <p className="text-sm text-gray-300 mb-3">
            Run with Spotify artist ID, artist name, or both. Artist name enables non-Spotify fallback providers.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              value={inputArtistId}
              onChange={(e) => setInputArtistId(e.target.value)}
              placeholder="Spotify artist ID (optional)"
              className="bg-black border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#555]"
            />
            <input
              value={inputArtistName}
              onChange={(e) => setInputArtistName(e.target.value)}
              placeholder="Artist name (recommended)"
              className="bg-black border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#555]"
            />
            <button
              type="button"
              onClick={runScan}
              className="bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition"
            >
              Run Analysis
            </button>
          </div>
        </div>
      </section>
    );
  }

  useEffect(() => {
    async function load() {
      if (!artistId && !artistName) {
        setError("Missing artistId or artistName query parameter.");
        setLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams();
        if (artistId) params.set("artistId", artistId);
        if (artistName) params.set("artistName", artistName);

        const res = await fetch(`/api/royalty/recovery-package?${params.toString()}`);
        const text = await res.text();
        let json: any = null;

        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }

        if (!res.ok) {
          const serverMessage =
            json?.error ||
            (res.status === 504
              ? "The audit request timed out. Please retry in a moment."
              : `Audit request failed (HTTP ${res.status}).`);
          setError(serverMessage);
        } else if (json?.error) {
          setError(json.error);
        } else {
          setData(json as RecoveryPackage);
        }
      } catch {
        setError("Failed to load audit results due to a network or gateway error.");
      }
      setLoading(false);
    }
    load();
  }, [artistId, artistName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Running metadata analysis...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white px-8 py-16">
        <header className="max-w-6xl mx-auto mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Royalty Intelligence Dashboard</h1>
        </header>
        <LauncherPanel />
        <div className="max-w-6xl mx-auto bg-[#220000] border border-red-700 px-6 py-4 rounded-xl">
          <p className="text-red-400 font-medium">Error: {error}</p>
        </div>
      </div>
    );
  }

  const { artist, summary, tracks, methodology } = data;
  const flaggedTracks = tracks.filter(
    (t) =>
      t.metadata_flags.missing_isrc ||
      t.metadata_flags.missing_release_date ||
      t.metadata_flags.duplicate_title
  );
  const aboveLowSignal = tracks.filter((t) => t.royalty_signal.tier !== "low").length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white px-8 py-16">
      <header className="max-w-6xl mx-auto mb-16">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
          Metadata Intelligence Layer
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Royalty Intelligence Dashboard</h1>
        <p className="text-gray-400 mt-2">
          Artist: <span className="text-white font-medium">{artist.name}</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Analysis generated: {new Date(data.generated_at).toLocaleString()}
        </p>
      </header>

      <LauncherPanel />

      {/* Intelligence Summary */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            Intelligence Summary
          </p>
          <p className="text-white text-lg leading-relaxed">{summary.insight_summary}</p>
        </div>
      </section>

      {/* Health Score + Stats */}
      <section className="max-w-6xl mx-auto mb-12 grid md:grid-cols-3 gap-6">
        <RoyaltyHealthCard score={summary.metadata_integrity_score} />

        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-1">Catalog Overview</p>
          <p className="text-3xl font-bold text-white">{summary.total_tracks}</p>
          <p className="text-gray-400 text-sm mt-1">Total tracks</p>
          <div className="mt-4 space-y-1 text-sm">
            <p className="text-gray-300">
              Missing ISRCs:{" "}
              <span className="text-red-400 font-medium">{summary.missing_isrcs}</span>
            </p>
            <p className="text-gray-300">
              Registration coverage:{" "}
              <span className="text-white">{summary.registration_coverage_percent}%</span>
            </p>
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-1">Signal Distribution</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-400 font-medium">Elevated</span>
              <span className="text-white font-bold">
                {summary.royalty_signal_distribution.elevated}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400 font-medium">Emerging</span>
              <span className="text-white font-bold">
                {summary.royalty_signal_distribution.emerging}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Low</span>
              <span className="text-white font-bold">
                {summary.royalty_signal_distribution.low}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Directional Value Estimate */}
      <section className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl font-semibold mb-4">Directional Value Estimate</h2>
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-4">
            Estimated unclaimed royalty value based on catalog activity signals and missing
            registrations.
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-green-400 text-4xl font-bold">
              ${summary.estimated_value_range_usd.low.toLocaleString()}
            </span>
            <span className="text-gray-400">–</span>
            <span className="text-green-300 text-4xl font-bold">
              ${summary.estimated_value_range_usd.high.toLocaleString()}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-3">
            Confidence:{" "}
            <span className="text-white capitalize">
              {summary.estimated_value_range_usd.confidence}
            </span>
            {" · "}Based on {summary.royalty_signal_distribution.elevated} elevated-signal tracks at
            $50–$200 per track. Illustrative only — not a financial statement.
          </p>
        </div>
      </section>

      {/* Conversion Message */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6">
          <p className="text-white leading-relaxed">
            You have{" "}
            <span className="text-red-400 font-semibold">{summary.missing_isrcs}</span> tracks not
            registered with SoundExchange or equivalent rights organizations, and several show signs
            of external playback activity. This combination suggests a high likelihood of unclaimed
            royalties.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Tracks with signals above low: <span className="text-white">{aboveLowSignal}</span>
          </p>
        </div>
      </section>

      {/* Playback Signals */}
      <section className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl font-semibold mb-4">Playback Signals</h2>
        <p className="text-gray-400 mb-4 text-sm">
          Your catalog shows activity signals across digital platforms. These signals may indicate
          external usage that generates royalties.
        </p>
        <div className="overflow-x-auto border border-[#222] rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111] text-gray-300">
              <tr>
                <th className="px-4 py-3">Track</th>
                <th className="px-4 py-3">ISRC</th>
                <th className="px-4 py-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => {
                const level = track.playback_signals.level;
                const color =
                  level === "high"
                    ? "text-green-400"
                    : level === "medium"
                    ? "text-yellow-400"
                    : "text-gray-400";
                return (
                  <tr key={track.track_id} className="border-t border-[#222]">
                    <td className="px-4 py-3">{track.track_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {track.isrc ?? <span className="text-red-400">Missing</span>}
                    </td>
                    <td className={`px-4 py-3 font-medium capitalize ${color}`}>{level}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Royalty Opportunity Signals */}
      <section className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl font-semibold mb-4">Royalty Opportunity Signals</h2>
        <p className="text-gray-400 mb-4 text-sm">
          Signal-based inference of potential gaps in how tracks may be recognized across rights
          systems.
        </p>
        <div className="overflow-x-auto border border-[#222] rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#111] text-gray-300">
              <tr>
                <th className="px-4 py-3">Track</th>
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => {
                const { tier, score, confidence, message } = track.royalty_signal;
                const tierColor =
                  tier === "elevated"
                    ? "text-green-400"
                    : tier === "emerging"
                    ? "text-yellow-400"
                    : "text-gray-400";
                const confColor =
                  confidence === "high"
                    ? "text-green-400"
                    : confidence === "medium"
                    ? "text-yellow-400"
                    : "text-gray-400";
                return (
                  <tr key={`signal-${track.track_id}`} className="border-t border-[#222]">
                    <td className="px-4 py-3">{track.track_name}</td>
                    <td className={`px-4 py-3 font-medium capitalize ${tierColor}`}>{tier}</td>
                    <td className="px-4 py-3">{score}</td>
                    <td className={`px-4 py-3 capitalize ${confColor}`}>{confidence}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">{message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Metadata Flags */}
      {flaggedTracks.length > 0 && (
        <section className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-semibold mb-4">Metadata Flags</h2>
          <div className="overflow-x-auto border border-[#222] rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#111] text-gray-300">
                <tr>
                  <th className="px-4 py-3">Track</th>
                  <th className="px-4 py-3">Missing ISRC</th>
                  <th className="px-4 py-3">Missing Date</th>
                  <th className="px-4 py-3">Duplicate Title</th>
                </tr>
              </thead>
              <tbody>
                {flaggedTracks.map((track) => (
                  <tr key={`flags-${track.track_id}`} className="border-t border-[#222]">
                    <td className="px-4 py-3">{track.track_name}</td>
                    <td className="px-4 py-3">
                      {track.metadata_flags.missing_isrc ? (
                        <span className="text-red-400">Yes</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {track.metadata_flags.missing_release_date ? (
                        <span className="text-yellow-400">Yes</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {track.metadata_flags.duplicate_title ? (
                        <span className="text-yellow-400">Yes</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Methodology */}
      <section className="max-w-6xl mx-auto mb-12">
        <h2 className="text-2xl font-semibold mb-4">Methodology</h2>
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6">
          <p className="text-gray-300 mb-4">{methodology.description}</p>
          <ul className="space-y-2">
            {methodology.limitations.map((l, i) => (
              <li key={i} className="text-gray-500 text-sm flex items-start gap-2">
                <span className="text-gray-600 mt-0.5">–</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Forensic Audit Modules */}
      <section className="max-w-6xl mx-auto mb-32">
        <h2 className="text-2xl font-semibold mb-6">Forensic Audit Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            "Missing ISRCs",
            "Duplicate Entries",
            "Incorrect Metadata",
            "Unmatched Royalties",
            "Label Discrepancies",
            "Publisher Conflicts",
            "Artist Name Variations",
            "Release Date Mismatches",
            "Territory Errors",
            "Payment Audit",
            "Royalty Rate Validation",
            "Distribution Audit",
            "Mechanical Rights Audit",
            "Performance Rights Audit",
            "Digital Platform Audit",
            "Physical Sales Audit",
            "Historical Data Review",
            "Summary Report Generation",
          ].map((module) => (
            <div
              key={module}
              className="bg-[#111] border border-[#222] rounded-xl p-6 hover:bg-[#151515] transition"
            >
              <h3 className="text-lg font-medium">{module}</h3>
              <p className="text-gray-400 text-sm mt-2">
                Automated analysis module. Click to expand (future).
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function RoyaltyRecoveryDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-gray-400">Loading audit dashboard...</p>
        </div>
      }
    >
      <RoyaltyRecoveryDashboardContent />
    </Suspense>
  );
}
