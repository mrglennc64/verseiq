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
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-5xl font-semibold tracking-tight">Royalty Recovery</h1>
        <p className="text-lg text-gray-300 mt-4 max-w-2xl">
          VerseIQ scans global DSP metadata, identifies missing registrations,
          and generates a forensic royalty recovery package for artists,
          producers, and rights-holders.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8 pb-20">
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3">1. Catalog Scan</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We pull your Spotify catalog, normalize ISRC metadata, and create a deduplicated export keyed for audit ingestion.
          </p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3">2. Rights-Chain Audit</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Upload SoundExchange data to compare registrations and identify performer-side royalty gaps.
          </p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3">3. Recovery Package</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Export a claim-ready package with missing works, metadata evidence, and actions for recovery.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="bg-[#0F0F0F] border border-[#222] rounded-2xl p-8">
          <h3 className="text-2xl font-semibold mb-4">Source Options</h3>
          <p className="text-gray-400 mb-6">
            You can run VerseIQ with Spotify automation or without Spotify using manual CSV ingestion.
          </p>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-[#161616] border border-[#222] rounded-lg p-4">
              <p className="text-white font-medium">Option A: Spotify Auto Scan</p>
              <p className="text-gray-400 mt-2">Paste artist URL, playlist URL, or artist ID and scan automatically.</p>
            </div>
            <div className="bg-[#161616] border border-[#222] rounded-lg p-4">
              <p className="text-white font-medium">Option B: Manual Catalog CSV</p>
              <p className="text-gray-400 mt-2">Upload your own catalog CSV plus SoundExchange CSV to run a rights-chain comparison.</p>
            </div>
            <div className="bg-[#161616] border border-[#222] rounded-lg p-4">
              <p className="text-white font-medium">Option C: SoundExchange First</p>
              <p className="text-gray-400 mt-2">Use the dedicated SoundExchange workflow for direct gap investigations.</p>
              <a className="inline-block mt-3 text-gray-200 underline" href="/verseiq/soundexchange-gaps">
                Open SoundExchange Gaps
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-10">
        <div className="bg-[#0F0F0F] border border-[#222] rounded-2xl p-10">
          <h3 className="text-2xl font-semibold mb-4">Start Your Royalty Recovery</h3>
          <p className="text-gray-400 mb-8 max-w-xl">
            Enter Spotify artist URL, playlist URL, or artist ID to begin the automated scan.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <input
              value={catalogInput}
              onChange={(e) => setCatalogInput(e.target.value)}
              placeholder="https://open.spotify.com/artist/... or artist ID"
              className="flex-1 bg-black border border-[#333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#555]"
              required
            />

            <button
              type="button"
              onClick={scanCatalog}
              disabled={isScanning}
              className="bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-60"
            >
              {isScanning ? "Scanning..." : "Scan Catalog"}
            </button>
          </div>

          {error ? <p className="text-red-400 text-sm mt-4">{error}</p> : null}

          <p className="text-xs text-gray-500 mt-4">
            Your data is never stored. VerseIQ performs a one-time scan and returns downloadable outputs.
          </p>
        </div>
      </section>

      {catalog ? (
        <section className="max-w-6xl mx-auto px-6 pb-10">
          <div className="bg-[#0F0F0F] border border-[#222] rounded-2xl p-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-2xl font-semibold">Catalog Preview</h3>
                <p className="text-gray-400 text-sm mt-1">{catalog.catalogName}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(catalog.csv, `${slugifyFileName(catalog.catalogName)}_spotify_catalog.csv`)
                }
                className="bg-white text-black font-medium px-5 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Download Spotify CSV
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mt-6">
              <div className="bg-[#161616] border border-[#222] rounded-lg p-4">
                <div className="text-xs text-gray-400">Tracks Found</div>
                <div className="text-2xl font-semibold">{catalog.tracksFound}</div>
              </div>
              <div className="bg-[#161616] border border-[#222] rounded-lg p-4">
                <div className="text-xs text-gray-400">Unique ISRCs</div>
                <div className="text-2xl font-semibold">{catalog.uniqueIsrcs}</div>
              </div>
              <div className="bg-[#161616] border border-[#222] rounded-lg p-4">
                <div className="text-xs text-gray-400">Tracks With ISRC</div>
                <div className="text-2xl font-semibold">{catalog.tracksWithIsrc}</div>
              </div>
              <div className="bg-[#161616] border border-[#5B3A3A] rounded-lg p-4">
                <div className="text-xs text-gray-400">Missing ISRC</div>
                <div className="text-2xl font-semibold text-rose-300">{catalog.tracksMissingIsrc}</div>
              </div>
            </div>

            {catalog.previewRows.length ? (
              <div className="mt-6 overflow-auto border border-[#222] rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-[#151515] text-gray-300">
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
                      <tr key={`${row.trackName}-${row.albumName}-${row.isrc || "missing"}`} className="border-t border-[#222]">
                        <td className="px-3 py-2">{row.trackName}</td>
                        <td className="px-3 py-2 text-gray-300">{row.artistNames}</td>
                        <td className="px-3 py-2 text-gray-300">{row.albumName}</td>
                        <td className="px-3 py-2 text-gray-300">{row.releaseDate || "-"}</td>
                        <td className="px-3 py-2 text-gray-300">{row.isrc || "Missing"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {catalog.missingIsrcPreview.length ? (
              <div className="mt-5 rounded-lg border border-[#5B3A3A] bg-[#1A1111] p-4">
                <p className="text-sm text-rose-300 font-medium">Metadata warnings</p>
                <p className="text-sm text-gray-300 mt-1">
                  Some tracks are missing ISRC and cannot be matched reliably until metadata is corrected.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {catalog ? (
        <section className="max-w-4xl mx-auto px-6 pb-12">
          <div className="bg-[#0F0F0F] border border-[#222] rounded-2xl p-8">
            <h3 className="text-xl font-semibold">Compare With SoundExchange</h3>
            <p className="text-gray-400 text-sm mt-1 mb-4">
              Upload your SoundExchange export to generate performer registration gaps.
            </p>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                ref={seFileInputRef}
                type="file"
                accept=".csv"
                className="flex-1 bg-black border border-[#333] rounded-lg px-4 py-3 text-white"
              />
              <button
                type="button"
                onClick={runComparison}
                disabled={isComparing}
                className="bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-60"
              >
                {isComparing ? "Comparing..." : "Find Missing Registrations"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!catalog ? (
        <section className="max-w-4xl mx-auto px-6 pb-12">
          <div className="bg-[#0F0F0F] border border-[#222] rounded-2xl p-8">
            <h3 className="text-xl font-semibold">Manual Rights-Chain Comparison (No Spotify)</h3>
            <p className="text-gray-400 text-sm mt-1 mb-4">
              If Spotify scan is unavailable, upload your catalog CSV and SoundExchange CSV to run the same comparison engine.
            </p>

            <div className="space-y-4">
              <input
                ref={manualCatalogFileInputRef}
                type="file"
                accept=".csv"
                className="w-full bg-black border border-[#333] rounded-lg px-4 py-3 text-white"
              />
              <input
                ref={seFileInputRef}
                type="file"
                accept=".csv"
                className="w-full bg-black border border-[#333] rounded-lg px-4 py-3 text-white"
              />
              <button
                type="button"
                onClick={runComparison}
                disabled={isComparing}
                className="bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-60"
              >
                {isComparing ? "Comparing..." : "Run Manual Comparison"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {report ? (
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <SoundexchangeAuditCard catalogName={catalog?.catalogName || "Unknown catalog"} report={report} />
        </section>
      ) : null}
    </div>
  );
}
