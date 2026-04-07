"use client";

import { useEffect, useRef, useState } from "react";
import { SoundexchangeAuditCard } from "../../components/SoundexchangeAuditCard";
import type { GapReport } from "../../types/gapReport";

type ExportedCatalog = {
  artistId: string;
  artistName: string;
  uniqueIsrcs: number;
  csv: string;
};

function buildCsvFile(content: string, fileName: string) {
  return new File([content], fileName, { type: "text/csv;charset=utf-8" });
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
  const [artistInput, setArtistInput] = useState("");
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

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ?? "https://useverseiq.com/callback";
  const authorizeUrl = clientId
    ? "https://accounts.spotify.com/authorize?" +
      new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "",
        show_dialog: "false",
      }).toString()
    : null;

  async function exportSpotifyCatalog() {
    const trimmedArtistInput = artistInput.trim();
    if (!token || !trimmedArtistInput) {
      setErrorMessage("Paste a Spotify artist URL or artist ID before exporting.");
      return;
    }

    setErrorMessage(null);
    setIsExportingCatalog(true);

    try {
      let activeToken = token;
      let res = await fetch(
        `/api/spotify/export-catalog?artist=${encodeURIComponent(trimmedArtistInput)}&token=${encodeURIComponent(activeToken)}`
      );

      if (res.status === 401) {
        const refreshedToken = await refreshAccessTokenIfPossible();
        if (refreshedToken) {
          activeToken = refreshedToken;
          res = await fetch(
            `/api/spotify/export-catalog?artist=${encodeURIComponent(trimmedArtistInput)}&token=${encodeURIComponent(activeToken)}`
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
      downloadCsv(
        nextCatalog.csv,
        `${nextCatalog.artistName.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_spotify_catalog.csv`
      );
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
          `${exportedCatalog.artistName.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_spotify_catalog.csv`
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

  if (!token) {
    return (
      <div className="page-shell">
        <section className="page-card legal-card">
        <img src="/vlogo3.png" alt="VerseIQ logo" className="page-logo" />
        <h1>VerseIQ</h1>
        <p className="app-subtle">Connect Spotify to export a deduplicated ISRC catalog for SoundExchange forensics.</p>
        {!authorizeUrl ? (
          <p className="notice-error">
            Spotify client configuration is missing. Set NEXT_PUBLIC_SPOTIFY_CLIENT_ID.
          </p>
        ) : (
          <a
            href={authorizeUrl}
            style={{
              display: "inline-block",
              marginTop: 12,
              background: "var(--accent)",
              color: "var(--ink)",
              padding: "12px 18px",
              borderRadius: 999,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 10px 28px var(--shadow)",
            }}
          >
            Connect Spotify
          </a>
        )}
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="app-header">
        <div>
          <img src="/vlogo3.png" alt="VerseIQ logo" className="page-logo" />
          <h1 className="app-title">SoundExchange Gap Analysis</h1>
          <p className="app-subtle">
            Paste Spotify Artist URL, export the deduplicated catalog, upload SoundExchange CSV, and run a clean ISRC registration gap report.
          </p>
        </div>
        <button onClick={disconnectSpotify}>
          Disconnect Spotify
        </button>
      </div>

      {errorMessage ? <p className="notice-error" style={{ marginBottom: 18 }}>{errorMessage}</p> : null}

      <div className="panel-grid">
        <section className="panel-card">
          <h2>1. Export Spotify Catalog</h2>
          <p className="panel-copy">Paste a Spotify artist URL or raw artist ID. VerseIQ will export a deduplicated catalog CSV keyed by ISRC.</p>
          <label style={{ display: "block", marginBottom: 10 }}>
            Spotify Artist URL or ID
            <input
              value={artistInput}
              onChange={(event) => setArtistInput(event.target.value)}
              placeholder="https://open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ"
              className="text-input"
            />
          </label>
          <button onClick={exportSpotifyCatalog} disabled={isExportingCatalog}>
            {isExportingCatalog ? "Exporting Spotify Catalog..." : "Export Spotify Catalog"}
          </button>

          {exportedCatalog ? (
            <div className="notice-success" style={{ marginTop: 14 }}>
              <strong>{exportedCatalog.artistName}</strong> exported successfully. {exportedCatalog.uniqueIsrcs} unique Spotify ISRCs ready for comparison.
            </div>
          ) : null}
        </section>

        <section className="panel-card">
          <h2>2. Upload SoundExchange CSV</h2>
          <p className="panel-copy">Upload the SoundExchange export you want to compare against the Spotify catalog.</p>
          <input
            ref={seFileInputRef}
            type="file"
            accept=".csv"
            className="file-input"
          />
        </section>

        <section className="panel-card">
          <h2>3. Run Gap Analysis</h2>
          <p className="panel-copy">Run the forensic comparison and render the VerseIQ audit card.</p>
          <div className="button-row">
            <button onClick={runGapAnalysis} disabled={isRunningGapAnalysis || !exportedCatalog}>
              {isRunningGapAnalysis ? "Running Gap Analysis..." : "Run Gap Analysis"}
            </button>
            {exportedCatalog ? (
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    exportedCatalog.csv,
                    `${exportedCatalog.artistName.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_spotify_catalog.csv`
                  )
                }
              >
                Download Spotify CSV Again
              </button>
            ) : null}
          </div>
        </section>
      </div>

      {report ? (
        <div style={{ marginTop: 28 }}>
          <SoundexchangeAuditCard
            artistName={exportedCatalog?.artistName || "Unknown artist"}
            report={report}
          />
        </div>
      ) : null}
    </div>
  );
}
