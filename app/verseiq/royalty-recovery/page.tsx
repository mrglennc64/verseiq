"use client";

import { useRef, useState } from "react";
import { SoundexchangeAuditCard } from "../../../components/SoundexchangeAuditCard";
import type { GapReport } from "../../../types/gapReport";
import type { ExportedCatalog } from "../../../types/spotifyCatalog";

function buildCsvFile(content: string, fileName: string) {
  return new File([content], fileName, { type: "text/csv;charset=utf-8" });
}

function slugifyFileName(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
}

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function RoyaltyRecoveryPage() {
  const [catalogInput, setCatalogInput] = useState("");
  const [catalog, setCatalog] = useState<ExportedCatalog | null>(null);
  const [report, setReport] = useState<GapReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seFileInputRef = useRef<HTMLInputElement>(null);
  const manualCatalogFileInputRef = useRef<HTMLInputElement>(null);

  async function scanCatalog() {
    const trimmed = catalogInput.trim();
    if (!trimmed) {
      setError("Enter a Spotify artist URL, playlist URL, or artist ID.");
      return;
    }

    setError(null);
    setIsScanning(true);

    try {
      const res = await fetch(`/api/spotify/export-catalog?input=${encodeURIComponent(trimmed)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details || data?.error || `Catalog export failed (HTTP ${res.status})`);
      }

      setCatalog(data as ExportedCatalog);
      setReport(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Catalog scan failed.";
      if (/forbidden|403/i.test(msg)) {
        setError(
          "Spotify scan is currently blocked for this request. You can still run the audit by uploading a catalog CSV and a SoundExchange CSV below."
        );
      } else {
        setError(msg);
      }
    } finally {
      setIsScanning(false);
    }
  }

  async function runComparison() {
    const soundexchangeFile = seFileInputRef.current?.files?.[0];
    if (!soundexchangeFile) {
      setError("Upload a SoundExchange CSV before comparison.");
      return;
    }

    const manualCatalogFile = manualCatalogFileInputRef.current?.files?.[0];
    if (!catalog && !manualCatalogFile) {
      setError("Either scan Spotify catalog first, or upload a catalog CSV manually.");
      return;
    }

    setError(null);
    setIsComparing(true);

    try {
      const formData = new FormData();
      formData.append("soundexchange_csv", soundexchangeFile);

      if (catalog) {
        formData.append(
          "spotify_csv",
          buildCsvFile(catalog.csv, `${slugifyFileName(catalog.catalogName)}_spotify_catalog.csv`)
        );
      } else if (manualCatalogFile) {
        formData.append("spotify_csv", manualCatalogFile);
      }

      const res = await fetch("/api/gap", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details || data?.error || `Comparison failed (HTTP ${res.status})`);
      }

      setReport(data as GapReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setIsComparing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0908] text-white">
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="rounded-3xl border border-[#3a2e24] bg-gradient-to-br from-[#1a1410] via-[#241a12] to-[#0d0a08] p-8 md:p-12">
          <p className="text-xs uppercase tracking-[0.24em] text-[#d0b49d]">Royalty Recovery</p>
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight mt-4">
            Get Paid What You&apos;re Owed
          </h1>
          <p className="text-lg md:text-xl text-[#ead7c6] mt-4 max-w-3xl">
            We detect missing money in your catalog by matching metadata, registration coverage,
            and usage signals across rights systems.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-[#5e4634] bg-[#18120d] px-4 py-2 text-[#ffd0b0]">
              Missing Money Detection
            </span>
            <span className="rounded-full border border-[#5e4634] bg-[#18120d] px-4 py-2 text-[#ffd0b0]">
              Royalty Recovery Intelligence
            </span>
            <span className="rounded-full border border-[#5e4634] bg-[#18120d] px-4 py-2 text-[#ffd0b0]">
              Claim-Ready Evidence
            </span>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-5 pb-10">
        <div className="bg-[#14100d] border border-[#30261f] rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-3">1. Scan Catalog</h2>
          <p className="text-[#d9c7b8] leading-relaxed">
            Ingest your catalog and normalize ISRC metadata so tracks can be matched reliably.
          </p>
        </div>

        <div className="bg-[#14100d] border border-[#30261f] rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-3">2. Find Gaps</h2>
          <p className="text-[#d9c7b8] leading-relaxed">
            Compare against SoundExchange data and expose missing registrations and metadata blockers.
          </p>
        </div>

        <div className="bg-[#14100d] border border-[#30261f] rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-3">3. Recover Revenue</h2>
          <p className="text-[#d9c7b8] leading-relaxed">
            Export proof-backed outputs to fix rights data and start recovering unpaid royalties.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-10">
        <div className="bg-[#14100d] border border-[#30261f] rounded-2xl p-8">
          <h3 className="text-3xl font-semibold mb-3">Choose Your Source</h3>
          <p className="text-[#d9c7b8] mb-6">
            Run fully automated or upload your own files. Either way, you get the same gap detection engine.
          </p>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-[#1a140f] border border-[#342a22] rounded-xl p-4">
              <p className="text-white font-semibold">Option A: Spotify Auto Scan</p>
              <p className="text-[#c7b4a3] mt-2">Paste artist URL, playlist URL, or artist ID and scan instantly.</p>
            </div>
            <div className="bg-[#1a140f] border border-[#342a22] rounded-xl p-4">
              <p className="text-white font-semibold">Option B: Manual Catalog CSV</p>
              <p className="text-[#c7b4a3] mt-2">Upload your catalog CSV plus SoundExchange CSV to run the same audit.</p>
            </div>
            <div className="bg-[#1a140f] border border-[#342a22] rounded-xl p-4">
              <p className="text-white font-semibold">Option C: SoundExchange First</p>
              <p className="text-[#c7b4a3] mt-2">Start directly with SoundExchange gap investigation workflows.</p>
              <a className="inline-block mt-3 text-[#f2d8bf] underline" href="/verseiq/soundexchange-gaps">
                Open SoundExchange Gaps
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-10">
        <div className="bg-[#14100d] border border-[#30261f] rounded-2xl p-8 md:p-10">
          <h3 className="text-3xl font-semibold mb-3">Start Recovering My Royalties</h3>
          <p className="text-[#d9c7b8] mb-7 text-lg max-w-2xl">
            Enter artist input to launch the scan and reveal where money is leaking.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <input
              value={catalogInput}
              onChange={(e) => setCatalogInput(e.target.value)}
              placeholder="https://open.spotify.com/artist/... or artist ID"
              className="flex-1 bg-[#0d0a08] border border-[#46372d] rounded-xl px-4 py-3 text-white placeholder-[#9d8979] focus:outline-none focus:border-[#d08754]"
              required
            />

            <button
              type="button"
              onClick={scanCatalog}
              disabled={isScanning}
              className="bg-[#e18e5c] text-black font-semibold px-8 py-3 rounded-xl hover:bg-[#f3a170] transition disabled:opacity-60"
            >
              {isScanning ? "Scanning..." : "Scan For Missing Money"}
            </button>
          </div>

          {error ? <p className="text-red-300 text-sm mt-4">{error}</p> : null}

          <p className="text-xs text-[#a58f7d] mt-4">
            Files are processed for this session only. Use manual CSV mode if Spotify is unavailable.
          </p>
        </div>
      </section>

      {catalog ? (
        <section className="max-w-6xl mx-auto px-6 pb-10">
          <div className="bg-[#14100d] border border-[#30261f] rounded-2xl p-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-3xl font-semibold">Evidence Snapshot</h3>
                <p className="text-[#c6b2a0] text-sm mt-1">{catalog.catalogName}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(catalog.csv, `${slugifyFileName(catalog.catalogName)}_spotify_catalog.csv`)
                }
                className="bg-[#f4e4d6] text-black font-medium px-5 py-2 rounded-lg hover:bg-white transition"
              >
                Download Evidence CSV
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mt-6">
              <div className="bg-[#1a140f] border border-[#342a22] rounded-lg p-4">
                <div className="text-xs text-[#bca693]">Tracks Found</div>
                <div className="text-2xl font-semibold">{catalog.tracksFound}</div>
              </div>
              <div className="bg-[#1a140f] border border-[#342a22] rounded-lg p-4">
                <div className="text-xs text-[#bca693]">Unique ISRCs</div>
                <div className="text-2xl font-semibold">{catalog.uniqueIsrcs}</div>
              </div>
              <div className="bg-[#1a140f] border border-[#342a22] rounded-lg p-4">
                <div className="text-xs text-[#bca693]">Tracks With ISRC</div>
                <div className="text-2xl font-semibold">{catalog.tracksWithIsrc}</div>
              </div>
              <div className="bg-[#241210] border border-[#5B3A3A] rounded-lg p-4">
                <div className="text-xs text-[#d8b5b5]">Missing ISRC</div>
                <div className="text-2xl font-semibold text-red-300">{catalog.tracksMissingIsrc}</div>
              </div>
            </div>

            {catalog.previewRows.length ? (
              <div className="mt-6 overflow-auto border border-[#342a22] rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-[#1a140f] text-[#e8d5c3]">
                    <tr>
                      <th className="text-left px-3 py-2">Track</th>
                      <th className="text-left px-3 py-2">Artist</th>
                      <th className="text-left px-3 py-2">Album</th>
                      <th className="text-left px-3 py-2">Release</th>
                      <th className="text-left px-3 py-2">ISRC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.previewRows.map((row) => (
                      <tr key={`${row.trackName}-${row.albumName}-${row.isrc || "missing"}`} className="border-t border-[#342a22]">
                        <td className="px-3 py-2">{row.trackName}</td>
                        <td className="px-3 py-2 text-[#dac8b8]">{row.artistNames}</td>
                        <td className="px-3 py-2 text-[#dac8b8]">{row.albumName}</td>
                        <td className="px-3 py-2 text-[#dac8b8]">{row.releaseDate || "-"}</td>
                        <td className="px-3 py-2 text-[#dac8b8]">{row.isrc || "Missing"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {catalog.missingIsrcPreview.length ? (
              <div className="mt-5 rounded-lg border border-[#5B3A3A] bg-[#241210] p-4">
                <p className="text-sm text-red-300 font-medium">Revenue Risk Warning</p>
                <p className="text-sm text-[#dfcfc2] mt-1">
                  Some tracks are missing ISRC and cannot be matched reliably until metadata is corrected.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {catalog ? (
        <section className="max-w-4xl mx-auto px-6 pb-12">
          <div className="bg-[#14100d] border border-[#30261f] rounded-2xl p-8">
            <h3 className="text-2xl font-semibold">Find Missing Registrations</h3>
            <p className="text-[#d9c7b8] text-sm mt-1 mb-4">
              Upload SoundExchange export to reveal tracks likely earning but not fully registered.
            </p>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                ref={seFileInputRef}
                type="file"
                accept=".csv"
                className="flex-1 bg-[#0d0a08] border border-[#46372d] rounded-lg px-4 py-3 text-white"
              />
              <button
                type="button"
                onClick={runComparison}
                disabled={isComparing}
                className="bg-[#98ffa9] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#b7ffc2] transition disabled:opacity-60"
              >
                {isComparing ? "Comparing..." : "Find Missing Money"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!catalog ? (
        <section className="max-w-4xl mx-auto px-6 pb-12">
          <div className="bg-[#14100d] border border-[#30261f] rounded-2xl p-8">
            <h3 className="text-2xl font-semibold">Manual Recovery Scan (No Spotify)</h3>
            <p className="text-[#d9c7b8] text-sm mt-1 mb-4">
              If Spotify scan is unavailable, upload your catalog CSV and SoundExchange CSV to run the same comparison engine.
            </p>

            <div className="space-y-4">
              <input
                ref={manualCatalogFileInputRef}
                type="file"
                accept=".csv"
                className="w-full bg-[#0d0a08] border border-[#46372d] rounded-lg px-4 py-3 text-white"
              />
              <input
                ref={seFileInputRef}
                type="file"
                accept=".csv"
                className="w-full bg-[#0d0a08] border border-[#46372d] rounded-lg px-4 py-3 text-white"
              />
              <button
                type="button"
                onClick={runComparison}
                disabled={isComparing}
                className="bg-[#98ffa9] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#b7ffc2] transition disabled:opacity-60"
              >
                {isComparing ? "Comparing..." : "Run Manual Recovery Scan"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="max-w-7xl mx-auto px-6 pb-12">
        <h2 className="text-3xl font-semibold mb-5">Recovery Plans</h2>
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

      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-[#5d3d2b] bg-gradient-to-r from-[#1d130d] via-[#25170f] to-[#1a120d] p-8 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-3">Stop Losing Royalties</h2>
          <p className="text-[#e8d4c5] mb-5">Run your scan now and move into recovery while the evidence is fresh.</p>
          <button
            type="button"
            onClick={scanCatalog}
            disabled={isScanning}
            className="rounded-xl bg-[#98ffa9] text-black font-semibold px-8 py-3 hover:bg-[#b6ffc2] transition disabled:opacity-60"
          >
            {isScanning ? "Scanning..." : "Start Recovering My Royalties"}
          </button>
        </div>
      </section>

      {report ? (
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <SoundexchangeAuditCard catalogName={catalog?.catalogName || "Unknown catalog"} report={report} />
        </section>
      ) : null}
    </div>
  );
}
