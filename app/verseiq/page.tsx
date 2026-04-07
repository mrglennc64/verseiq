"use client";

import { useEffect, useRef, useState } from "react";
import { SoundexchangeAuditCard } from "../../components/SoundexchangeAuditCard";
import type { GapReport } from "../../types/gapReport";
import type { ExportedCatalog } from "../../types/spotifyCatalog";

function buildCsvFile(content: string, fileName: string) {
  return new File([content], fileName, { type: "text/csv;charset=utf-8" });
}

function slugifyFileName(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
}

function describeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  if (/playlist\//i.test(trimmed)) {
    return "Playlist detected. Workflow will scan every unique track in this playlist.";
  }
  if (/artist\//i.test(trimmed)) {
    return "Artist detected. Workflow will scan albums, singles, and appearances for this artist.";
  }
  if (/track\//i.test(trimmed)) {
    return "Track links are not supported here. Use an artist URL, playlist URL, or raw artist ID.";
  }
  return "Raw Spotify artist ID detected. Workflow will resolve the artist and scan the catalog.";
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

export default function VerseIQPage() {
  const [token, setToken] = useState<string | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [catalogInput, setCatalogInput] = useState("");
  const [exportedCatalog, setExportedCatalog] = useState<ExportedCatalog | null>(null);
  const [report, setReport] = useState<GapReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState(true);
  const [isExportingCatalog, setIsExportingCatalog] = useState(false);
  const [isRunningGapAnalysis, setIsRunningGapAnalysis] = useState(false);
  const seFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function resolveToken() {
      try {
        const storedToken = window.localStorage.getItem("spotify_access_token");
        const expiresAtRaw = window.localStorage.getItem("spotify_access_token_expires_at");
        const refreshToken = window.localStorage.getItem("spotify_refresh_token");
        const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;
        const isExpired = !expiresAt || Date.now() >= expiresAt - 30_000;

        if (storedToken && !isExpired) {
          setToken(storedToken);
          return;
        }

        if (refreshToken) {
          const refreshRes = await fetch(
            `/api/spotify/refresh?refresh_token=${encodeURIComponent(refreshToken)}`
          );
          const refreshData = await refreshRes.json().catch(() => ({}));

          if (refreshRes.ok && refreshData.access_token) {
            const nextExpiresAt = Date.now() + Number(refreshData.expires_in ?? 3600) * 1000;
            window.localStorage.setItem("spotify_access_token", refreshData.access_token);
            window.localStorage.setItem("spotify_access_token_expires_at", String(nextExpiresAt));
            if (refreshData.refresh_token) {
              window.localStorage.setItem("spotify_refresh_token", refreshData.refresh_token);
            }
            setToken(refreshData.access_token);
            return;
          }
        }

        setToken(null);
      } catch (error) {
        console.error(error);
        setErrorMessage("Could not restore your Spotify session. Reconnect and try again.");
      } finally {
        setIsRefreshingToken(false);
      }
    }

    resolveToken();
  }, []);

  useEffect(() => {
    async function resolveAuthorizeUrl() {
      try {
        const res = await fetch("/api/spotify/authorize-url");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.authorizeUrl) {
          setAuthorizeUrl(String(data.authorizeUrl));
          return;
        }
        setAuthorizeUrl(null);
      } catch {
        setAuthorizeUrl(null);
      }
    }

    resolveAuthorizeUrl();
  }, []);

  async function refreshAccessTokenIfPossible() {
    const refreshToken = window.localStorage.getItem("spotify_refresh_token");
    if (!refreshToken) {
      return null;
    }

    const refreshRes = await fetch(
      `/api/spotify/refresh?refresh_token=${encodeURIComponent(refreshToken)}`
    );
    const refreshData = await refreshRes.json().catch(() => ({}));
    if (!refreshRes.ok || !refreshData.access_token) {
      return null;
    }

    const nextExpiresAt = Date.now() + Number(refreshData.expires_in ?? 3600) * 1000;
    window.localStorage.setItem("spotify_access_token", refreshData.access_token);
    window.localStorage.setItem("spotify_access_token_expires_at", String(nextExpiresAt));
    if (refreshData.refresh_token) {
      window.localStorage.setItem("spotify_refresh_token", refreshData.refresh_token);
    }
    setToken(refreshData.access_token);
    return refreshData.access_token as string;
  }

  function disconnectSpotify() {
    window.localStorage.removeItem("spotify_access_token");
    window.localStorage.removeItem("spotify_access_token_expires_at");
    window.localStorage.removeItem("spotify_refresh_token");
    setToken(null);
    setExportedCatalog(null);
    setReport(null);
    setErrorMessage(null);
  }

  async function exportSpotifyCatalog() {
    const trimmedInput = catalogInput.trim();
    if (!trimmedInput) {
      setErrorMessage("Paste a Spotify artist URL, playlist URL, or raw artist ID before scanning.");
      return;
    }

    setErrorMessage(null);
    setIsExportingCatalog(true);

    try {
      let activeToken = token;
      const baseUrl = `/api/spotify/export-catalog?input=${encodeURIComponent(trimmedInput)}`;
      let res = await fetch(
        activeToken
          ? `${baseUrl}&token=${encodeURIComponent(activeToken)}`
          : baseUrl
      );

      if (res.status === 401 && activeToken) {
        const refreshedToken = await refreshAccessTokenIfPossible();
        if (refreshedToken) {
          activeToken = refreshedToken;
          res = await fetch(
            `/api/spotify/export-catalog?input=${encodeURIComponent(trimmedInput)}&token=${encodeURIComponent(activeToken)}`
          );
        }
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details || data?.error || `Catalog export failed (HTTP ${res.status})`);
      }

      const nextCatalog = data as ExportedCatalog;
      setExportedCatalog(nextCatalog);
      setReport(null);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? `Export failed: ${error.message}` : "Export failed."
      );
    } finally {
      setIsExportingCatalog(false);
    }
  }

  async function runGapAnalysis() {
    if (!exportedCatalog) {
      setErrorMessage("Export the Spotify catalog first.");
      return;
    }

    const soundexchangeFile = seFileInputRef.current?.files?.[0];
    if (!soundexchangeFile) {
      setErrorMessage("Upload the SoundExchange CSV before running gap analysis.");
      return;
    }

    setErrorMessage(null);
    setIsRunningGapAnalysis(true);

    try {
      const formData = new FormData();
      formData.append("soundexchange_csv", soundexchangeFile);
      formData.append(
        "spotify_csv",
        buildCsvFile(
          exportedCatalog.csv,
          `${slugifyFileName(exportedCatalog.catalogName)}_spotify_catalog.csv`
        )
      );

      const res = await fetch("/api/gap", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details || data?.error || `Gap analysis failed (HTTP ${res.status})`);
      }

      setReport(data as GapReport);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? `Gap analysis failed: ${error.message}` : "Gap analysis failed."
      );
    } finally {
      setIsRunningGapAnalysis(false);
    }
  }

  if (isRefreshingToken) {
    return (
      <div className="page-shell">
        <section className="page-card legal-card">
        <img src="/vlogo3.png" alt="VerseIQ logo" className="page-logo" />
        <h1>VerseIQ</h1>
        <p className="app-subtle">Checking your Spotify session...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="app-header">
        <div>
          <img src="/vlogo3.png" alt="VerseIQ logo" className="page-logo" />
          <h1 className="app-title">Royalty Recovery Workflow</h1>
          <p className="app-subtle">
            Scan a Spotify artist or playlist, review ISRC coverage, upload your SoundExchange export, and find the registrations you are still missing.
          </p>
        </div>
        {token ? (
          <button onClick={disconnectSpotify}>Disconnect Spotify</button>
        ) : authorizeUrl ? (
          <a
            href={authorizeUrl}
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "var(--ink)",
              padding: "12px 18px",
              borderRadius: 999,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 10px 28px var(--shadow)",
            }}
          >
            Connect Spotify (Optional)
          </a>
        ) : null}
      </div>

      {errorMessage ? <p className="notice-error" style={{ marginBottom: 18 }}>{errorMessage}</p> : null}

      <div className="panel-grid">
        <section className="panel-card">
          <h2>1. Scan Spotify Source</h2>
          <p className="panel-copy">Paste a Spotify artist URL, playlist URL, or raw artist ID. Workflow will detect the source type, scan the catalog, and prepare a deduplicated CSV keyed by ISRC.</p>
          <label style={{ display: "block", marginBottom: 10 }}>
            Spotify Artist URL, Playlist URL, or Artist ID
            <input
              value={catalogInput}
              onChange={(event) => setCatalogInput(event.target.value)}
              placeholder="https://open.spotify.com/artist/... or https://open.spotify.com/playlist/..."
              className="text-input"
            />
          </label>
          {describeInput(catalogInput) ? (
            <p className="panel-copy" style={{ marginTop: 0, marginBottom: 12 }}>
              {describeInput(catalogInput)}
            </p>
          ) : null}
          <button onClick={exportSpotifyCatalog} disabled={isExportingCatalog}>
            {isExportingCatalog ? "Scanning Spotify Catalog..." : "Scan Spotify Catalog"}
          </button>

          {exportedCatalog ? (
            <div className="notice-success" style={{ marginTop: 14 }}>
              <strong>{exportedCatalog.catalogName}</strong> is ready. Found {exportedCatalog.tracksFound} tracks, {exportedCatalog.tracksWithIsrc} with valid ISRCs, and {exportedCatalog.tracksMissingIsrc} needing metadata review.
            </div>
          ) : null}
        </section>

        {exportedCatalog ? (
          <section className="panel-card">
            <h2>2. Review Catalog Preview</h2>
            <p className="panel-copy">Review what the workflow found before you compare registrations or download the CSV.</p>

            <div className="workflow-summary-grid">
              <div className="workflow-summary-card">
                <div className="workflow-summary-label">Source</div>
                <div className="workflow-summary-value">{exportedCatalog.sourceType === "playlist" ? "Playlist" : "Artist"}</div>
                <div className="workflow-summary-copy">{exportedCatalog.sourceName}</div>
              </div>
              <div className="workflow-summary-card">
                <div className="workflow-summary-label">Tracks Found</div>
                <div className="workflow-summary-value">{exportedCatalog.tracksFound}</div>
                <div className="workflow-summary-copy">Unique Spotify tracks scanned in this source.</div>
              </div>
              <div className="workflow-summary-card">
                <div className="workflow-summary-label">Valid ISRC</div>
                <div className="workflow-summary-value">{exportedCatalog.tracksWithIsrc}</div>
                <div className="workflow-summary-copy">Tracks ready for SoundExchange comparison.</div>
              </div>
              <div className="workflow-summary-card workflow-summary-card--warn">
                <div className="workflow-summary-label">Missing ISRC</div>
                <div className="workflow-summary-value">{exportedCatalog.tracksMissingIsrc}</div>
                <div className="workflow-summary-copy">Tracks that may need metadata cleanup before recovery.</div>
              </div>
            </div>

            <div className="button-row" style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => downloadCsv(exportedCatalog.csv, `${slugifyFileName(exportedCatalog.catalogName)}_spotify_catalog.csv`)}
              >
                Download Spotify CSV
              </button>
            </div>

            {exportedCatalog.previewRows.length ? (
              <div style={{ overflowX: "auto", marginBottom: 18 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Track</th>
                      <th>Artist</th>
                      <th>Album</th>
                      <th>Release</th>
                      <th>ISRC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportedCatalog.previewRows.map((row) => (
                      <tr key={`${row.isrc}-${row.trackName}`}>
                        <td>{row.trackName}</td>
                        <td>{row.artistNames}</td>
                        <td>{row.albumName}</td>
                        <td>{row.releaseDate || "-"}</td>
                        <td>{row.isrc || "Missing"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {exportedCatalog.missingIsrcPreview.length ? (
              <div className="workflow-warning-block">
                <h3>Metadata Warnings</h3>
                <p className="panel-copy">These tracks were found on Spotify without a valid ISRC. They will not appear in the recovery comparison until metadata is fixed.</p>
                <ul className="workflow-warning-list">
                  {exportedCatalog.missingIsrcPreview.map((row) => (
                    <li key={`${row.trackName}-${row.albumName}`}>{row.trackName} - {row.artistNames}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="panel-card">
          <h2>3. Upload SoundExchange CSV</h2>
          <p className="panel-copy">Upload the SoundExchange export you want to compare against the Spotify catalog.</p>
          <input
            ref={seFileInputRef}
            type="file"
            accept=".csv"
            className="file-input"
          />
        </section>

        <section className="panel-card">
          <h2>4. Compare Registrations</h2>
          <p className="panel-copy">Run the comparison and see which Spotify tracks are missing from SoundExchange.</p>
          <div className="button-row">
            <button onClick={runGapAnalysis} disabled={isRunningGapAnalysis || !exportedCatalog}>
              {isRunningGapAnalysis ? "Running Comparison..." : "Find Missing Registrations"}
            </button>
          </div>
        </section>
      </div>

      {report ? (
        <div style={{ marginTop: 28 }}>
          <section className="panel-card" style={{ marginBottom: 18 }}>
            <h2>Recovery Summary</h2>
            <p className="panel-copy">
              We found {report.spotifyUniqueIsrc} Spotify ISRCs in <strong>{exportedCatalog?.catalogName || "this catalog"}</strong>. {report.presentInSoundexchange.length} are already registered in SoundExchange, and <strong>{report.missingInSoundexchange.length}</strong> are still missing.
            </p>
          </section>
          <SoundexchangeAuditCard
            catalogName={exportedCatalog?.catalogName || "Unknown catalog"}
            report={report}
          />
        </div>
      ) : null}
    </div>
  );
}
