"use client";

/**
 * Royalty Recovery Wizard
 * ----------------------
 * Multi-step component for:
 * 1. Input: Paste Spotify artist/playlist URL
 * 2. Preview: Show what was found
 * 3. Upload: SoundExchange CSV comparison
 * 4. Results: Gap analysis + royalty estimates
 */

import React, { useState } from "react";
import type { ExportedCatalog } from "@/types/spotifyCatalog";
import type { GapAnalysisResult } from "@/types/gapAnalysis";
import { executeRoyaltyRecoveryWorkflow, exportSpotifyCatalogAction } from "@/app/actions/royaltyRecoveryWorkflow";

type WorkflowStep = "input" | "preview" | "soundexchange-upload" | "results" | "error";

interface WorkflowState {
  step: WorkflowStep;
  spotifyExport?: ExportedCatalog;
  gapAnalysis?: GapAnalysisResult;
  gapSummaryText?: string;
  error?: string;
  isLoading: boolean;
  progress: string[];
}

export function RoyaltyRecoveryWizard() {
  const [state, setState] = useState<WorkflowState>({
    step: "input",
    isLoading: false,
    progress: [],
  });

  const handleSpotifyInput = async (input: string) => {
    setState((s) => ({
      ...s,
      isLoading: true,
      progress: ["🎵 Connecting to Spotify..."],
    }));

    try {
      const result = await executeRoyaltyRecoveryWorkflow({
        spotifyInput: input,
      });

      if (result.status === "error") {
        setState((s) => ({
          ...s,
          step: "error",
          error: result.error,
          isLoading: false,
        }));
        return;
      }

      setState((s) => ({
        ...s,
        step: "preview",
        spotifyExport: result.spotifyExport,
        progress: result.steps,
        isLoading: false,
      }));
    } catch (err: any) {
      setState((s) => ({
        ...s,
        step: "error",
        error: err.message,
        isLoading: false,
      }));
    }
  };

  const handleSoundExchangeUpload = async (csvText: string) => {
    if (!state.spotifyExport) return;

    setState((s) => ({
      ...s,
      isLoading: true,
      progress: [...(s.progress || []), "📊 Analyzing gaps..."],
    }));

    try {
      const result = await executeRoyaltyRecoveryWorkflow({
        spotifyInput: `${state.spotifyExport.sourceType}/${state.spotifyExport.sourceId}`,
        soundexchangeCsv: csvText,
      });

      if (result.status === "error") {
        setState((s) => ({
          ...s,
          step: "error",
          error: result.error,
          isLoading: false,
        }));
        return;
      }

      setState((s) => ({
        ...s,
        step: "results",
        gapAnalysis: result.gapAnalysis,
        gapSummaryText: result.gapSummaryText,
        progress: result.steps,
        isLoading: false,
      }));
    } catch (err: any) {
      setState((s) => ({
        ...s,
        step: "error",
        error: err.message,
        isLoading: false,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 Royalty Recovery Suite</h1>
          <p className="text-lg text-gray-600">
            Find missing royalties in your Spotify catalog and recover lost income
          </p>
        </div>

        {/* Progress Indicator */}
        {state.progress.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border-l-4 border-indigo-500">
            <div className="space-y-2">
              {state.progress.map((msg, i) => (
                <div key={i} className="text-sm text-gray-700">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: Input */}
        {state.step === "input" && <InputStep onSubmit={handleSpotifyInput} isLoading={state.isLoading} />}

        {/* STEP 2: Preview */}
        {state.step === "preview" && state.spotifyExport && (
          <PreviewStep
            export={state.spotifyExport}
            onProceed={() => setState((s) => ({ ...s, step: "soundexchange-upload" }))}
          />
        )}

        {/* STEP 3: SoundExchange Upload */}
        {state.step === "soundexchange-upload" && (
          <SoundExchangeUploadStep
            onSubmit={handleSoundExchangeUpload}
            isLoading={state.isLoading}
            onSkip={() => {
              // User can skip SoundExchange for now
              setState((s) => ({
                ...s,
                step: "preview",
              }));
            }}
          />
        )}

        {/* STEP 4: Results */}
        {state.step === "results" && state.gapAnalysis && (
          <ResultsStep analysis={state.gapAnalysis} summaryText={state.gapSummaryText} />
        )}

        {/* Error State */}
        {state.step === "error" && (
          <ErrorStep
            error={state.error || "Unknown error"}
            onReset={() => setState((s) => ({ ...s, step: "input", error: undefined }))}
          />
        )}
      </div>
    </div>
  );
}

/**
 * STEP 1: Input (Spotify URL or ID)
 */
function InputStep({
  onSubmit,
  isLoading,
}: {
  onSubmit: (input: string) => void;
  isLoading: boolean;
}) {
  const [input, setInput] = useState("");

  return (
    <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Step 1: Scan Your Catalog</h2>
        <p className="text-gray-600">Paste a Spotify artist or playlist URL to get started</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🎵 Spotify Artist or Playlist URL
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://open.spotify.com/artist/..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-2">
            ✅ Artist URLs supported | ✅ Playlist URLs supported | ❌ Track links not supported
          </p>
        </div>

        <button
          onClick={() => onSubmit(input)}
          disabled={!input || isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition"
        >
          {isLoading ? "Scanning..." : "Scan Catalog"}
        </button>
      </div>

      {/* Quick Start Examples */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-2">📝 Need an example?</p>
        <p className="text-xs text-blue-800">
          Try any public Spotify artist like: <code className="bg-white px-1 py-0.5">https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf94</code> (The Beatles)
        </p>
      </div>
    </div>
  );
}

/**
 * STEP 2: Preview Results
 */
function PreviewStep({
  export: spotifyExport,
  onProceed,
}: {
  export: ExportedCatalog;
  onProceed: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Step 2: Preview Results</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-indigo-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 uppercase">Total Tracks</p>
            <p className="text-2xl font-bold text-indigo-600">{spotifyExport.tracksFound}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 uppercase">With ISRC</p>
            <p className="text-2xl font-bold text-green-600">{spotifyExport.tracksWithIsrc}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 uppercase">Missing ISRC</p>
            <p className="text-2xl font-bold text-yellow-600">{spotifyExport.tracksMissingIsrc}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 uppercase">Source</p>
            <p className="text-2xl font-bold text-purple-600 capitalize">{spotifyExport.sourceType}</p>
          </div>
        </div>

        {/* Sample Tracks */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Sample Tracks</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">Track</th>
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">Artist</th>
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">ISRC</th>
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">Album</th>
                </tr>
              </thead>
              <tbody>
                {spotifyExport.previewRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900">{row.trackName}</td>
                    <td className="py-2 px-3 text-gray-600">{row.artistNames}</td>
                    <td className="py-2 px-3 text-gray-600 font-mono text-xs">{row.isrc || "—"}</td>
                    <td className="py-2 px-3 text-gray-600">{row.albumName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warning: Missing ISRC */}
        {spotifyExport.tracksMissingIsrc > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>{spotifyExport.tracksMissingIsrc} tracks are missing ISRC metadata.</strong> These may be
              difficult to register with SoundExchange. Contact Spotify support or consider re-releasing.
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={onProceed}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Next: Compare with SoundExchange
          </button>
          <button
            onClick={() => {
              // Download CSV
              const element = document.createElement("a");
              element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(spotifyExport.csv));
              element.setAttribute("download", `spotify_catalog_${new Date().toISOString().split("T")[0]}.csv`);
              element.style.display = "none";
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }}
            className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition"
          >
            ⬇️ Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * STEP 3: SoundExchange Upload
 */
function SoundExchangeUploadStep({
  onSubmit,
  isLoading,
  onSkip,
}: {
  onSubmit: (csv: string) => void;
  isLoading: boolean;
  onSkip: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-white roundedlg shadow-md p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Step 3: Compare with SoundExchange</h2>
        <p className="text-gray-600">Upload your SoundExchange export to find missing royalties</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">📄 SoundExchange CSV</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileLoad}
              className="hidden"
            />
            <p className="text-gray-600">Drag and drop or click to browse</p>
            <p className="text-xs text-gray-500 mt-2">CSV files only (ISRC + Title columns required)</p>
          </div>
          {csvText && <p className="text-xs text-green-600 mt-2">✅ CSV loaded ({csvText.length} bytes)</p>}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              if (csvText) onSubmit(csvText);
            }}
            disabled={!csvText || isLoading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition"
          >
            {isLoading ? "Analyzing..." : "Analyze Gaps"}
          </button>
          <button
            onClick={onSkip}
            className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition"
          >
            Skip for now
          </button>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-2">🤔 Don't have SoundExchange data?</p>
        <p className="text-xs text-blue-800">
          Log into your SoundExchange account and export your registered tracks. This enables the royalty gap
          analysis.
        </p>
      </div>
    </div>
  );
}

/**
 * STEP 4: Results & Royalty Analysis
 */
function ResultsStep({
  analysis,
  summaryText,
}: {
  analysis: GapAnalysisResult;
  summaryText?: string;
}) {
  const { summary, missingTracks } = analysis;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-500">
          <p className="text-sm text-gray-600 uppercase font-semibold">Missing Tracks</p>
          <p className="text-4xl font-bold text-red-600 mt-2">{summary.missingCount}</p>
          <p className="text-xs text-red-600 mt-1">{summary.missingPercent}% of catalog</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 uppercase font-semibold">Registered</p>
          <p className="text-4xl font-bold text-green-600 mt-2">{summary.presentCount}</p>
          <p className="text-xs text-green-600 mt-1">{((summary.presentCount / summary.totalTracks) * 100).toFixed(1)}% recovery</p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600 uppercase font-semibold">Missing Royalties</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            ${summary.estimatedMissingRoyaltiesLow.toFixed(0)} – ${summary.estimatedMissingRoyaltiesHigh.toFixed(0)}
          </p>
          <p className="text-xs text-purple-600 mt-1">Per year (estimated)</p>
        </div>
      </div>

      {/* Priority Alert */}
      <div className={`rounded-lg p-6 ${
        summary.recoveryPriority === "critical"
          ? "bg-red-50 border-l-4 border-red-500"
          : summary.recoveryPriority === "high"
          ? "bg-orange-50 border-l-4 border-orange-500"
          : "bg-yellow-50 border-l-4 border-yellow-500"
      }`}>
        <p className={`text-lg font-semibold ${
          summary.recoveryPriority === "critical"
            ? "text-red-900"
            : summary.recoveryPriority === "high"
            ? "text-orange-900"
            : "text-yellow-900"
        }`}>
          🎯 Recovery Priority:{" "}
          <span className="uppercase">{summary.recoveryPriority}</span>
        </p>
        <p className={`text-sm mt-2 ${
          summary.recoveryPriority === "critical"
            ? "text-red-800"
            : summary.recoveryPriority === "high"
            ? "text-orange-800"
            : "text-yellow-800"
        }`}>
          {summary.recoveryPriority === "critical"
            ? "More than 50% of your catalog is unregistered. This requires immediate action."
            : summary.recoveryPriority === "high"
            ? "A significant portion (25-50%) of your catalog is missing. Start registering today."
            : "Some tracks are missing. Review and register them at your earliest convenience."
          }
        </p>
      </div>

      {/* Missing Tracks Table */}
      {missingTracks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔴 Tracks to Register with SoundExchange</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">Track</th>
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">Artist</th>
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">ISRC</th>
                  <th className="text-right py-2 px-3 text-gray-700 font-medium">Est. Royalty/Yr</th>
                </tr>
              </thead>
              <tbody>
                {missingTracks.slice(0, 10).map((track, i) => (
                  <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900 font-medium">{track.trackName}</td>
                    <td className="py-2 px-3 text-gray-600">{track.artistNames}</td>
                    <td className="py-2 px-3 text-gray-600 font-mono text-xs">{track.isrc}</td>
                    <td className="py-2 px-3 text-right text-green-600 font-semibold">
                      ${track.estimatedAnnualRoyalty?.toFixed(2) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {missingTracks.length > 10 && (
            <p className="text-xs text-gray-600 mt-4">
              ... and {missingTracks.length - 10} more tracks. Download the full report for details.
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition">
          📥 Download Full Report
        </button>
        <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition">
          🚀 Start Recovery Process
        </button>
      </div>
    </div>
  );
}

/**
 * Error State
 */
function ErrorStep({ error, onReset }: { error: string; onReset: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="text-center">
        <p className="text-4xl mb-4">❌</p>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Something Went Wrong</h2>
        <p className="text-gray-600 mb-6 bg-red-50 border border-red-200 rounded p-4">{error}</p>
        <button
          onClick={onReset}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
