"use client";

import { useMemo, useState } from "react";

type GapRow = {
  isrc: string;
  title: string;
  artist: string;
  release: string;
  label: string;
  upc: string;
};

type GapResponse = {
  summary: {
    spotifyUniqueIsrc: number;
    soundexchangeUniqueIsrc: number;
    missingInSoundExchange: number;
    presentInSoundExchange: number;
    soundexchangeOrphans: number;
    gapPercent: number;
  };
  missingInSoundExchange: GapRow[];
  presentInSoundExchange: GapRow[];
  soundexchangeOrphans: string[];
  downloads: {
    missingCsv: string;
    presentCsv: string;
  };
};

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SoundExchangeGapsPage() {
  const [soundexchangeFile, setSoundexchangeFile] = useState<File | null>(null);
  const [spotifyFile, setSpotifyFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<GapResponse | null>(null);

  const canRun = useMemo(() => !!soundexchangeFile && !!spotifyFile && !loading, [soundexchangeFile, spotifyFile, loading]);

  const runDiff = async () => {
    if (!soundexchangeFile || !spotifyFile) {
      setError("Please upload both SoundExchange and Spotify CSV files.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("soundexchangeCsv", soundexchangeFile);
      formData.append("spotifyCsv", spotifyFile);

      const res = await fetch("/api/soundexchange-gaps", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gap analysis failed");
      }

      setResult(data as GapResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gap analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <img src="/vlogo3.png" alt="VerseIQ logo" className="page-logo" />
      <h1 className="app-title" style={{ marginBottom: 8 }}>SoundExchange Gap Finder</h1>
      <p className="app-subtle" style={{ marginBottom: 20 }}>
        Upload SoundExchange export plus Spotify catalog to get missing ISRCs directly from your site.
      </p>

      <div className="panel-grid" style={{ marginBottom: 16 }}>
        <label>
          SoundExchange CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setSoundexchangeFile(e.target.files?.[0] || null)}
            className="file-input"
          />
        </label>

        <label>
          Spotify CSV (use spotify_catalog_enriched.csv)
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setSpotifyFile(e.target.files?.[0] || null)}
            className="file-input"
          />
        </label>
      </div>

      <button onClick={runDiff} disabled={!canRun}>
        {loading ? "Analyzing..." : "Find Missing ISRC"}
      </button>

      {error && <p className="notice-error" style={{ marginTop: 12 }}>{error}</p>}

      {result && (
        <section className="panel-card" style={{ marginTop: 24 }}>
          <h2>Summary</h2>
          <ul>
            <li>Spotify unique ISRC: {result.summary.spotifyUniqueIsrc}</li>
            <li>SoundExchange unique ISRC: {result.summary.soundexchangeUniqueIsrc}</li>
            <li>Missing in SoundExchange: {result.summary.missingInSoundExchange}</li>
            <li>Present in SoundExchange: {result.summary.presentInSoundExchange}</li>
            <li>SoundExchange orphans: {result.summary.soundexchangeOrphans}</li>
            <li>Gap rate: {result.summary.gapPercent}%</li>
          </ul>

          <div className="button-row" style={{ marginBottom: 12 }}>
            <button onClick={() => downloadText("missing_in_soundexchange.csv", result.downloads.missingCsv)}>
              Download Missing CSV
            </button>
            <button onClick={() => downloadText("present_in_soundexchange.csv", result.downloads.presentCsv)}>
              Download Present CSV
            </button>
          </div>

          <h3>Missing ISRC Preview</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ISRC</th>
                  <th>Title</th>
                  <th>Artist</th>
                </tr>
              </thead>
              <tbody>
                {result.missingInSoundExchange.slice(0, 25).map((row) => (
                  <tr key={row.isrc}>
                    <td>{row.isrc}</td>
                    <td>{row.title}</td>
                    <td>{row.artist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
