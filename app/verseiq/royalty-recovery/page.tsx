"use client";

import { useEffect, useMemo, useState } from "react";
import { extractArtistId } from "@/lib/exportSpotifyCatalog";

type ScanStatus = "pending" | "processing" | "complete" | "failed";

type ScanStatusResponse = {
  scanId: string;
  status: ScanStatus;
  progress: number;
  message?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ScanResultResponse = {
  scanId: string;
  status: "complete";
  result: {
    artist: { id: string; name: string };
    summary: {
      total_tracks: number;
      missing_isrcs: number;
      metadata_integrity_score: number;
      registration_coverage_percent: number;
      royalty_confidence_score: number;
      royalty_signal_distribution: { elevated: number; emerging: number; low: number };
      estimated_value_range_usd: { low: number; high: number };
    };
    tracks: Array<{
      track_id: string;
      track_name: string;
      isrc: string | null;
      album_name: string;
      age_bucket: "new" | "developing" | "established" | "legacy";
      playback_signals: { level: "low" | "medium" | "high" };
      royalty_signal: {
        tier: "low" | "emerging" | "elevated";
        score: number;
        confidence: "low" | "medium" | "high";
      };
      metadata_flags: {
        missing_isrc: boolean;
        missing_release_date: boolean;
        duplicate_title: boolean;
      };
    }>;
  };
};

export default function RoyaltyRecoveryPage() {
  const [artistInput, setArtistInput] = useState("");
  const [scanId, setScanId] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatusResponse | null>(null);
  const [result, setResult] = useState<ScanResultResponse["result"] | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRunning = status?.status === "pending" || status?.status === "processing";

  async function fetchStatus(id: string) {
    const res = await fetch(`/api/scan/status?scanId=${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to load scan status.");
    return data as ScanStatusResponse;
  }

  async function fetchResult(id: string) {
    const res = await fetch(`/api/scan/results?scanId=${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to load scan results.");
    return data as ScanResultResponse;
  }

  async function startScan() {
    const trimmed = artistInput.trim();
    if (!trimmed) {
      setError("Enter a Spotify artist URL or artist ID.");
      return;
    }

    let artistId = "";
    try {
      artistId = extractArtistId(trimmed);
    } catch (e: any) {
      setError(e?.message || "Could not parse artist ID.");
      return;
    }

    setStarting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Unable to start scan. Please try again.");
      }

      setScanId(String(data.scanId));
    } catch (e: any) {
      setError(e?.message || "Unable to start scan. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function retryScan() {
    setScanId(null);
    setStatus(null);
    setResult(null);
    await startScan();
  }

  useEffect(() => {
    if (!scanId) return;

    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const next = await fetchStatus(scanId);
        if (!mounted) return;
        setStatus(next);

        if (next.status === "complete") {
          const loaded = await fetchResult(scanId);
          if (!mounted) return;
          setResult(loaded.result);
          return;
        }

        if (next.status === "failed") {
          setError(next.error || next.message || "Scan failed.");
          return;
        }

        timer = setTimeout(poll, 2500);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to poll scan status.");
      }
    };

    poll();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [scanId]);

  const topTracks = useMemo(() => {
    if (!result?.tracks?.length) return [];
    return [...result.tracks]
      .sort((a, b) => b.royalty_signal.score - a.royalty_signal.score)
      .slice(0, 10);
  }, [result]);

  return (
    <div className="min-h-screen bg-[#0b0908] text-white px-6 py-12">
      <section className="max-w-6xl mx-auto rounded-3xl border border-[#3a2e24] bg-gradient-to-br from-[#1a1410] via-[#241a12] to-[#0d0a08] p-8 md:p-10 mb-8">
        <p className="text-xs uppercase tracking-[0.24em] text-[#d0b49d]">Royalty Recovery</p>
        <h1 className="text-4xl md:text-5xl font-semibold mt-3 leading-tight">
          Start Recovering My Royalties
        </h1>
        <p className="text-[#ead7c6] mt-3 text-lg max-w-3xl">
          Async scan pipeline with live progress. Start once, track status, then export evidence.
        </p>

        <div className="mt-6 grid md:grid-cols-[1fr_auto] gap-3">
          <input
            value={artistInput}
            onChange={(e) => setArtistInput(e.target.value)}
            placeholder="Spotify artist URL or raw artist ID"
            className="bg-[#0d0a08] border border-[#46372d] rounded-xl px-4 py-3 text-white placeholder-[#9d8979] focus:outline-none focus:border-[#d08754]"
          />
          <button
            type="button"
            onClick={startScan}
            disabled={starting || isRunning}
            className="rounded-xl bg-[#e18e5c] text-black font-semibold px-7 py-3 hover:bg-[#f3a170] transition disabled:opacity-60"
          >
            {starting ? "Starting..." : isRunning ? "Scan Running..." : "Start Royalty Recovery Scan"}
          </button>
        </div>

        {scanId ? <p className="text-sm text-[#d8c6b7] mt-3">Scan ID: {scanId}</p> : null}
        {error ? <p className="text-sm text-red-300 mt-3">{error}</p> : null}
      </section>

      {status ? (
        <section className="max-w-6xl mx-auto rounded-2xl border border-[#30261f] bg-[#14100d] p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-2xl font-semibold">Scan Status</h2>
            <span className="text-sm uppercase tracking-wider text-[#d2b8a1]">{status.status}</span>
          </div>
          <p className="text-[#dac8b8] text-sm mb-3">{status.message || "Processing..."}</p>
          <div className="h-2 bg-[#2a221c] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#98ffa9]"
              style={{ width: `${Math.max(2, Math.min(100, status.progress || 0))}%` }}
            />
          </div>
          <p className="text-xs text-[#a58f7d] mt-2">Progress: {status.progress}%</p>

          {status.status === "failed" ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={retryScan}
                className="rounded-lg bg-[#f4e4d6] text-black font-medium px-5 py-2 hover:bg-white"
              >
                Retry Scan
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-2xl border border-[#3d3127] bg-[#14100d] p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[#bfa893] text-sm">Artist</p>
                <h2 className="text-3xl font-semibold">{result.artist.name}</h2>
              </div>
              <a
                href={`/api/scan/export?scanId=${encodeURIComponent(scanId || "")}`}
                className="rounded-xl bg-[#98ffa9] text-black font-semibold px-6 py-3 hover:bg-[#b6ffc2] transition"
              >
                Export Scan CSV
              </a>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mt-6">
              <div className="bg-[#1a140f] border border-[#342a22] rounded-lg p-4">
                <div className="text-xs text-[#bca693]">Total Tracks</div>
                <div className="text-2xl font-semibold">{result.summary.total_tracks}</div>
              </div>
              <div className="bg-[#1a140f] border border-[#342a22] rounded-lg p-4">
                <div className="text-xs text-[#bca693]">Missing ISRCs</div>
                <div className="text-2xl font-semibold text-red-300">{result.summary.missing_isrcs}</div>
              </div>
              <div className="bg-[#1a140f] border border-[#342a22] rounded-lg p-4">
                <div className="text-xs text-[#bca693]">Confidence Score</div>
                <div className="text-2xl font-semibold">{result.summary.royalty_confidence_score}</div>
              </div>
              <div className="bg-[#1a140f] border border-[#342a22] rounded-lg p-4">
                <div className="text-xs text-[#bca693]">Estimated Range</div>
                <div className="text-xl font-semibold text-[#99ffad]">
                  ${result.summary.estimated_value_range_usd.low.toLocaleString()}-${result.summary.estimated_value_range_usd.high.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#3d3127] bg-[#14100d] p-6">
            <h3 className="text-2xl font-semibold mb-4">Top Track-Level Opportunities</h3>
            <div className="overflow-x-auto border border-[#342a22] rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-[#1a140f] text-[#e8d5c3]">
                  <tr>
                    <th className="text-left px-3 py-2">Track</th>
                    <th className="text-left px-3 py-2">ISRC</th>
                    <th className="text-left px-3 py-2">Tier</th>
                    <th className="text-left px-3 py-2">Score</th>
                    <th className="text-left px-3 py-2">Playback</th>
                  </tr>
                </thead>
                <tbody>
                  {topTracks.map((track) => (
                    <tr key={track.track_id} className="border-t border-[#342a22]">
                      <td className="px-3 py-2">{track.track_name}</td>
                      <td className="px-3 py-2 text-[#dac8b8]">{track.isrc || "Missing"}</td>
                      <td className="px-3 py-2 capitalize">{track.royalty_signal.tier}</td>
                      <td className="px-3 py-2">{track.royalty_signal.score}</td>
                      <td className="px-3 py-2 capitalize">{track.playback_signals.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
