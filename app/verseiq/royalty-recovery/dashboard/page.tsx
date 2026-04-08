"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ConfidenceLevel = "low" | "medium" | "high";
type SignalTier = "low" | "emerging" | "elevated";
type AgeBucket = "new" | "developing" | "established" | "legacy";

type EnrichedTrack = {
  track_id: string;
  track_name: string;
  isrc: string | null;
  album_name: string;
  release_date: string | null;
  popularity?: number;
  age_bucket: AgeBucket;
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
    royalty_confidence_score: number;
    royalty_confidence_label: string;
    royalty_signal_distribution: { elevated: number; emerging: number; low: number };
    gap_breakdown: {
      missing_from_soundexchange: number;
      metadata_issues: number;
      fully_registered: number;
    };
    estimated_value_range_usd: { low: number; high: number; confidence: ConfidenceLevel };
    insight_summary: string;
  };
  tracks: EnrichedTrack[];
  methodology: { description: string; limitations: string[] };
};

function confidenceCopy(score: number): string {
  if (score >= 81) return "High probability of unclaimed royalties detected";
  if (score >= 61) return "High probability of leakage across registrations";
  if (score >= 31) return "Medium leakage risk detected";
  return "Low current leakage risk";
}

function statusColor(score: number): string {
  if (score >= 81) return "text-red-300";
  if (score >= 61) return "text-orange-300";
  if (score >= 31) return "text-amber-300";
  return "text-lime-300";
}

function riskText(score: number): string {
  if (score >= 81) return "ACTIVE REVENUE LOSS";
  if (score >= 61) return "High probability";
  if (score >= 31) return "At risk";
  return "Low risk";
}

function scoreBar(value: number): string {
  return `${Math.max(6, Math.min(100, value))}%`;
}

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
      <section className="max-w-7xl mx-auto mb-10">
        <div className="rounded-2xl border border-[#2d2420] bg-[#18130f] p-5 md:p-6">
          <p className="text-sm text-[#e7d8cb] mb-3">
            Run analysis with Spotify artist ID, artist name, or both. Artist name enables fallback providers.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              value={inputArtistId}
              onChange={(e) => setInputArtistId(e.target.value)}
              placeholder="Spotify artist ID (optional)"
              className="bg-[#100d0a] border border-[#3a2f29] rounded-lg px-4 py-3 text-white placeholder-[#9f8c80] focus:outline-none focus:border-[#a96f4a]"
            />
            <input
              value={inputArtistName}
              onChange={(e) => setInputArtistName(e.target.value)}
              placeholder="Artist name (recommended)"
              className="bg-[#100d0a] border border-[#3a2f29] rounded-lg px-4 py-3 text-white placeholder-[#9f8c80] focus:outline-none focus:border-[#a96f4a]"
            />
            <button
              type="button"
              onClick={runScan}
              className="rounded-lg px-6 py-3 font-semibold bg-[#e08c5a] text-black hover:bg-[#f0a06f] transition"
            >
              Run Royalty Recovery Scan
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
              ? "The analysis timed out. Retry now with artistName to use fallback providers."
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

  const topTracks = useMemo(() => {
    if (!data) return [];
    return [...data.tracks]
      .sort((a, b) => b.royalty_signal.score - a.royalty_signal.score)
      .slice(0, 8);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0807] text-white flex items-center justify-center">
        <p className="text-[#c9b6a7]">Running royalty recovery analysis...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0807] text-white px-6 py-12 md:px-10">
        <header className="max-w-7xl mx-auto mb-8">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">Royalty Recovery</h1>
        </header>
        <LauncherPanel />
        <div className="max-w-7xl mx-auto rounded-xl border border-red-700 bg-[#2b1111] px-6 py-4">
          <p className="text-red-300 font-medium">Error: {error}</p>
        </div>
      </div>
    );
  }

  const { artist, summary } = data;
  const confidenceHeadline = confidenceCopy(summary.royalty_confidence_score);
  const confidenceTone = statusColor(summary.royalty_confidence_score);

  const missingIsrcRatio =
    summary.total_tracks > 0 ? (summary.missing_isrcs / summary.total_tracks) * 100 : 0;
  const unregisteredRatio =
    summary.total_tracks > 0
      ? (summary.gap_breakdown.missing_from_soundexchange / summary.total_tracks) * 100
      : 0;
  const metadataIssueRatio =
    summary.total_tracks > 0 ? (summary.gap_breakdown.metadata_issues / summary.total_tracks) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0a0807] text-white px-6 py-10 md:px-10 md:py-12">
      <header className="max-w-7xl mx-auto mb-10 rounded-3xl border border-[#3a2d22] bg-gradient-to-br from-[#1a1410] via-[#221a13] to-[#0d0a08] p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.24em] text-[#ceaf97] mb-4">Royalty Recovery</p>
        <h1 className="text-4xl md:text-6xl font-semibold leading-tight mb-3">
          You&apos;re Getting Streams - But Not Getting Paid
        </h1>
        <p className="text-lg text-[#e7d6c8] max-w-3xl">
          We found gaps between your catalog and royalty registrations that may leave money unclaimed.
        </p>

        <div className="mt-8 grid lg:grid-cols-3 gap-5 items-end">
          <div className="lg:col-span-2 rounded-2xl border border-[#523f31] bg-[#120f0d] p-6">
            <p className="text-sm uppercase tracking-wider text-[#ba9f8c] mb-2">Estimated Unclaimed Royalties</p>
            <p className="text-4xl md:text-6xl font-semibold text-[#99ffad]">
              ${summary.estimated_value_range_usd.low.toLocaleString()} - ${summary.estimated_value_range_usd.high.toLocaleString()}
            </p>
            <p className={`mt-3 text-lg ${confidenceTone}`}>{confidenceHeadline}</p>
            <p className="text-sm text-[#ad9686] mt-2">
              Artist: <span className="text-white font-medium">{artist.name}</span> · Source: {data.source}
            </p>
          </div>
          <div className="space-y-3">
            <button className="w-full rounded-xl bg-[#88ff9e] text-black font-semibold px-5 py-3 hover:bg-[#adffbc] transition">
              Unlock Full Recovery Plan
            </button>
            <button className="w-full rounded-xl border border-[#5b4737] bg-[#17120e] text-white font-semibold px-5 py-3 hover:bg-[#221910] transition">
              Fix My Missing Royalties
            </button>
            <div className="rounded-xl border border-[#5b4737] bg-[#17120e] px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-[#b59a84]">Confidence Badge</p>
              <p className={`text-lg font-semibold ${confidenceTone}`}>{riskText(summary.royalty_confidence_score)}</p>
            </div>
          </div>
        </div>
      </header>

      <LauncherPanel />

      <section className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-5 mb-10">
        <div className="rounded-2xl border border-[#3d3127] bg-[#14100d] p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-widest text-[#c0a48d] mb-1">Royalty Health</p>
          <h2 className="text-2xl md:text-3xl font-semibold">Health Score: {summary.royalty_confidence_score}</h2>
          <p className={`mt-2 text-sm font-medium ${confidenceTone}`}>Status: {riskText(summary.royalty_confidence_score)}</p>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#e3d0c0]">Missing ISRCs</span>
                <span className="text-[#ff9a9a]">{summary.missing_isrcs}</span>
              </div>
              <div className="h-2 rounded-full bg-[#2a221c] overflow-hidden">
                <div className="h-full bg-[#ff6b6b]" style={{ width: scoreBar(missingIsrcRatio) }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#e3d0c0]">Unregistered Tracks</span>
                <span className="text-[#ffb86b]">{summary.gap_breakdown.missing_from_soundexchange}</span>
              </div>
              <div className="h-2 rounded-full bg-[#2a221c] overflow-hidden">
                <div className="h-full bg-[#ff9f43]" style={{ width: scoreBar(unregisteredRatio) }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#e3d0c0]">Metadata Issues</span>
                <span className="text-[#fdd98a]">{summary.gap_breakdown.metadata_issues}</span>
              </div>
              <div className="h-2 rounded-full bg-[#2a221c] overflow-hidden">
                <div className="h-full bg-[#f4c95d]" style={{ width: scoreBar(metadataIssueRatio) }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#3d3127] bg-[#14100d] p-6">
          <p className="text-xs uppercase tracking-widest text-[#c0a48d] mb-2">Snapshot</p>
          <p className="text-3xl font-semibold">{summary.total_tracks}</p>
          <p className="text-sm text-[#c3ae9d]">Tracks analyzed</p>
          <div className="mt-5 space-y-2 text-sm">
            <p className="text-[#e3d0c0]">Registration coverage: <span className="text-white font-medium">{summary.registration_coverage_percent}%</span></p>
            <p className="text-[#e3d0c0]">Integrity score: <span className="text-white font-medium">{summary.metadata_integrity_score}/100</span></p>
            <p className="text-[#e3d0c0]">Generated: <span className="text-white font-medium">{new Date(data.generated_at).toLocaleString()}</span></p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto mb-10 rounded-2xl border border-[#3d3127] bg-[#14100d] p-6">
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">Where You&apos;re Losing Money</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[#c3ae9d] border-b border-[#33281f]">
              <tr>
                <th className="text-left py-3">Category</th>
                <th className="text-right py-3">Count</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#241d17]">
                <td className="py-3 text-[#ffd0d0]">Missing from SoundExchange</td>
                <td className="py-3 text-right font-semibold text-[#ff8f8f]">{summary.gap_breakdown.missing_from_soundexchange}</td>
              </tr>
              <tr className="border-b border-[#241d17]">
                <td className="py-3 text-[#ffe4b7]">Metadata issues</td>
                <td className="py-3 text-right font-semibold text-[#ffc86d]">{summary.gap_breakdown.metadata_issues}</td>
              </tr>
              <tr>
                <td className="py-3 text-[#d2ffd9]">Fully registered</td>
                <td className="py-3 text-right font-semibold text-[#9cffac]">{summary.gap_breakdown.fully_registered}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-7xl mx-auto mb-10">
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">Track-Level Opportunities</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {topTracks.map((track) => {
            const riskColor =
              track.royalty_signal.tier === "elevated"
                ? "text-red-300"
                : track.royalty_signal.tier === "emerging"
                ? "text-yellow-300"
                : "text-gray-300";
            const riskLabel =
              track.royalty_signal.tier === "elevated"
                ? "High probability"
                : track.royalty_signal.tier === "emerging"
                ? "Medium"
                : "Low";

            return (
              <div key={track.track_id} className="rounded-2xl border border-[#33281f] bg-[#14100d] p-5">
                <p className="font-semibold leading-snug">{track.track_name}</p>
                <p className={`mt-2 text-sm font-medium ${riskColor}`}>{riskLabel}</p>
                <p className="mt-2 text-xs text-[#beaa9a]">Likely generating royalties but not fully registered.</p>
                <p className="mt-3 text-xs text-[#9f8c80]">Score {track.royalty_signal.score} · Playback {track.playback_signals.level}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto mb-10 rounded-2xl border border-[#3d3127] bg-[#14100d] p-6">
        <h2 className="text-2xl md:text-3xl font-semibold mb-3">We Detect External Usage Signals From Your Catalog</h2>
        <p className="text-[#d9c7b8] mb-4">Our engine looks for track-level activity patterns and catalog maturity that often correlate with unclaimed rights revenue.</p>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-[#2f251d] bg-[#120e0b] p-4">
            <p className="text-[#beaa9a]">High Signal</p>
            <p className="text-2xl font-semibold text-[#8bff9d]">{summary.royalty_signal_distribution.elevated}</p>
          </div>
          <div className="rounded-xl border border-[#2f251d] bg-[#120e0b] p-4">
            <p className="text-[#beaa9a]">Medium Signal</p>
            <p className="text-2xl font-semibold text-[#ffd77c]">{summary.royalty_signal_distribution.emerging}</p>
          </div>
          <div className="rounded-xl border border-[#2f251d] bg-[#120e0b] p-4">
            <p className="text-[#beaa9a]">Low Signal</p>
            <p className="text-2xl font-semibold text-[#d7c7ba]">{summary.royalty_signal_distribution.low}</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto mb-10 rounded-2xl border border-[#3d3127] bg-[#14100d] p-6">
        <h2 className="text-2xl md:text-3xl font-semibold mb-3">How This Score Is Calculated</h2>
        <ul className="space-y-2 text-[#d9c7b8] text-sm">
          <li>Based on catalog analysis against registration status and ISRC completeness.</li>
          <li>Weighted confidence model: missing ISRC, registration gaps, playback, and catalog age.</li>
          <li>Identifies probable mismatches likely to suppress payouts.</li>
          <li>Estimated value range is directional and scales with signal strength and catalog maturity.</li>
        </ul>
      </section>

      <section className="max-w-7xl mx-auto mb-14">
        <h2 className="text-2xl md:text-3xl font-semibold mb-5">Choose Your Recovery Path</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#2e2f25] bg-[#11130e] p-5">
            <p className="text-sm uppercase tracking-wider text-[#b8beaa]">Free</p>
            <p className="text-3xl font-semibold mt-2">$0</p>
            <ul className="mt-4 space-y-2 text-sm text-[#d6dcc9]">
              <li>Basic scan</li>
              <li>Limited results</li>
              <li>Top issues only</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[#5b4a2e] bg-[#1a140c] p-5">
            <p className="text-sm uppercase tracking-wider text-[#d9be83]">Pro</p>
            <p className="text-3xl font-semibold mt-2">$39</p>
            <ul className="mt-4 space-y-2 text-sm text-[#f0ddbc]">
              <li>Full gap report</li>
              <li>CSV export</li>
              <li>Fix instructions</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[#5b2e2e] bg-[#1c0f0f] p-5">
            <p className="text-sm uppercase tracking-wider text-[#e8aaaa]">Recovery</p>
            <p className="text-2xl font-semibold mt-2">10-20% success fee</p>
            <p className="text-sm text-[#f2c8c8] mt-1">or $99-$299 one-time</p>
            <ul className="mt-4 space-y-2 text-sm text-[#f0cfcf]">
              <li>Registration handling</li>
              <li>Metadata correction</li>
              <li>Submission support</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto mb-20 rounded-3xl border border-[#5d3d2b] bg-gradient-to-r from-[#1d130d] via-[#25170f] to-[#1a120d] p-8 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold mb-3">Start Recovering My Royalties</h2>
        <p className="text-[#e8d4c5] mb-5">Stop leaving money on the table. Turn this scan into a completed recovery workflow.</p>
        <button className="rounded-xl bg-[#98ffa9] text-black font-semibold px-8 py-3 hover:bg-[#b6ffc2] transition">
          Start Recovering My Royalties
        </button>
      </section>
    </div>
  );
}

export default function RoyaltyRecoveryDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0807] text-white flex items-center justify-center">
          <p className="text-[#c9b6a7]">Loading royalty recovery dashboard...</p>
        </div>
      }
    >
      <RoyaltyRecoveryDashboardContent />
    </Suspense>
  );
}
