"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type RecentScan = {
  scanId: string;
  artistId: string;
  artistName: string | null;
  status: ScanStatus;
  progress: number;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function RoyaltyRecoveryPage() {
  const router = useRouter();
  const [artistInput, setArtistInput] = useState("");
  const [scanId, setScanId] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatusResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [scanSearch, setScanSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ScanStatus>("all");

  const isRunning = status?.status === "pending" || status?.status === "processing";

  const filteredRecentScans = useMemo(() => {
    const query = scanSearch.trim().toLowerCase();
    return recentScans.filter((scan) => {
      const matchesStatus = statusFilter === "all" || scan.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;

      return (
        scan.scanId.toLowerCase().includes(query) ||
        scan.artistId.toLowerCase().includes(query) ||
        (scan.artistName ?? "").toLowerCase().includes(query)
      );
    });
  }, [recentScans, scanSearch, statusFilter]);

  const latestActiveScan = useMemo(() => {
    return recentScans.find((scan) => scan.status === "processing" || scan.status === "pending") ?? null;
  }, [recentScans]);

  async function fetchStatus(id: string) {
    const res = await fetch(`/api/scan/status?scanId=${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to load scan status.");
    return data as ScanStatusResponse;
  }

  async function fetchRecentScans() {
    const res = await fetch("/api/scan/recent");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to load recent scans.");
    return (data?.scans ?? []) as RecentScan[];
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
      const scans = await fetchRecentScans().catch(() => []);
      setRecentScans(scans);
    } catch (e: any) {
      setError(e?.message || "Unable to start scan. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function retryScan() {
    setScanId(null);
    setStatus(null);
    await startScan();
  }

  useEffect(() => {
    fetchRecentScans().then(setRecentScans).catch(() => {});
  }, []);

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
          router.push(`/verseiq/royalty-recovery/results?scanId=${encodeURIComponent(scanId)}`);
          return;
        }

        if (next.status === "failed") {
          setError(next.error || next.message || "Scan failed.");
          fetchRecentScans().then(setRecentScans).catch(() => {});
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

        {latestActiveScan && scanId !== latestActiveScan.scanId ? (
          <section className="max-w-6xl mx-auto rounded-2xl border border-[#4e3b24] bg-[#18120c] p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#d3ae7c] mb-1">Resume Active Scan</p>
                <h2 className="text-2xl font-semibold text-white">
                  {latestActiveScan.artistName || latestActiveScan.artistId}
                </h2>
                <p className="text-sm text-[#dcc7b2] mt-1">
                  {latestActiveScan.status.toUpperCase()} · {latestActiveScan.progress}% · {latestActiveScan.message || "Processing scan..."}
                </p>
              </div>

              <a
                href={`/verseiq/royalty-recovery/results?scanId=${encodeURIComponent(latestActiveScan.scanId)}`}
                className="rounded-xl bg-[#e5a56b] text-black font-semibold px-6 py-3 text-center hover:bg-[#f0b37d] transition"
              >
                Resume Latest Scan
              </a>
            </div>
          </section>
        ) : null}

      <section className="max-w-6xl mx-auto rounded-2xl border border-[#30261f] bg-[#14100d] p-6 mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-semibold">Recent Scans</h2>
          <button
            type="button"
            onClick={() => fetchRecentScans().then(setRecentScans).catch(() => {})}
            className="rounded-lg border border-[#4b3d32] px-4 py-2 text-sm text-[#ead7c6] hover:bg-[#1b1511]"
          >
            Refresh
          </button>
        </div>

        <div className="grid md:grid-cols-[1fr_220px] gap-3 mb-4">
          <input
            value={scanSearch}
            onChange={(e) => setScanSearch(e.target.value)}
            placeholder="Search by artist, artist ID, or scan ID"
            className="bg-[#0d0a08] border border-[#46372d] rounded-xl px-4 py-3 text-white placeholder-[#9d8979] focus:outline-none focus:border-[#d08754]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | ScanStatus)}
            className="bg-[#0d0a08] border border-[#46372d] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d08754]"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="complete">Complete</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {filteredRecentScans.length === 0 ? (
          <p className="text-sm text-[#a58f7d]">No scans yet. Start one above.</p>
        ) : (
          <div className="space-y-3">
            {filteredRecentScans.map((scan) => (
              <div
                key={scan.scanId}
                className="rounded-xl border border-[#3a3028] bg-[#120e0b] px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-white">{scan.artistName || scan.artistId}</p>
                  <p className="text-xs text-[#a58f7d] mt-1">
                    {scan.status.toUpperCase()} · {scan.progress}% · Updated {new Date(scan.updatedAt).toLocaleString()}
                  </p>
                  {scan.message ? <p className="text-sm text-[#d8c6b7] mt-1">{scan.message}</p> : null}
                </div>

                <div className="flex gap-2">
                  <a
                    href={`/verseiq/royalty-recovery/results?scanId=${encodeURIComponent(scan.scanId)}`}
                    className="rounded-lg bg-[#e18e5c] text-black font-medium px-4 py-2 hover:bg-[#f3a170] transition"
                  >
                    Open Results
                  </a>
                  {scan.status === "complete" ? (
                    <a
                      href={`/api/scan/export?scanId=${encodeURIComponent(scan.scanId)}`}
                      className="rounded-lg border border-[#5b4737] bg-[#17120e] text-white font-medium px-4 py-2 hover:bg-[#221910] transition"
                    >
                      Export
                    </a>
                  ) : (
                    <span className="rounded-lg border border-[#3e342d] bg-[#120e0b] text-[#8f7d70] font-medium px-4 py-2">
                      Export When Complete
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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

    </div>
  );
}
