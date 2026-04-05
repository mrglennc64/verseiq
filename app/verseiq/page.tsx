"use client";

import { useEffect, useState } from "react";
import { computePlaylistGaps } from "./gapAnalysis";
import { type PlaylistMetadata } from "./territory";
import { buildRoyaltyAudit } from "./audit";

export default function VerseIQPage() {
  const [token, setToken] = useState<string | null>(null);
  const [artistId, setArtistId] = useState("");
  const [artistName, setArtistName] = useState("");
  const [artistSummary, setArtistSummary] = useState<any | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistMetadata[]>([]);
  const [referencePlaylists, setReferencePlaylists] = useState<PlaylistMetadata[]>([]);
  const [gaps, setGaps] = useState<PlaylistMetadata[]>([]);
  const [audit, setAudit] = useState<ReturnType<typeof buildRoyaltyAudit> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState(true);

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
          const refreshData = await refreshRes.json();

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

          window.localStorage.removeItem("spotify_access_token");
          window.localStorage.removeItem("spotify_access_token_expires_at");
        }

        setToken(null);
      } catch (error) {
        console.error("Failed to access/refresh Spotify token:", error);
        setErrorMessage("Browser storage is blocked. Please allow site storage/cookies and reload.");
      } finally {
        setIsRefreshingToken(false);
      }
    }

    resolveToken();
  }, []);

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

  async function fetchAnalysisData(accessToken: string) {
    const [artistRes, playlistsRes, refRes] = await Promise.all([
      fetch(`/api/spotify/artist?id=${artistId}&token=${accessToken}`),
      fetch(`/api/spotify/playlists?artist=${encodeURIComponent(artistName)}&token=${accessToken}`),
      fetch(
        `/api/spotify/playlists?artist=${encodeURIComponent(`${artistName} international`)}&token=${accessToken}`
      ),
    ]);

    const [artistData, playlistsData, refData] = await Promise.all([
      artistRes.json().catch(() => ({})),
      playlistsRes.json().catch(() => ({})),
      refRes.json().catch(() => ({})),
    ]);

    return {
      artist: { response: artistRes, data: artistData },
      playlists: { response: playlistsRes, data: playlistsData },
      reference: { response: refRes, data: refData },
    };
  }

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

  function formatApiError(details: {
    artist: { response: Response; data: any };
    playlists: { response: Response; data: any };
    reference: { response: Response; data: any };
  }) {
    const entries = [
      ["artist", details.artist],
      ["playlists", details.playlists],
      ["reference", details.reference],
    ] as const;

    return entries
      .filter(([, value]) => !value.response.ok)
      .map(([name, value]) => {
        const reason = value.data?.details || value.data?.error || `HTTP ${value.response.status}`;
        return `${name}: ${reason}`;
      })
      .join(" | ");
  }

  async function fetchArtistAndPlaylists() {
    setErrorMessage(null);

    if (!token || !artistId || !artistName) {
      setErrorMessage("Please provide Artist ID and Artist Name before running analysis.");
      return;
    }

    try {
      let analysis = await fetchAnalysisData(token);

      const hasUnauthorized = [analysis.artist, analysis.playlists, analysis.reference].some(
        (entry) => entry.response.status === 401
      );

      if (hasUnauthorized) {
        const refreshedToken = await refreshAccessTokenIfPossible();
        if (refreshedToken) {
          analysis = await fetchAnalysisData(refreshedToken);
        }
      }

      if (!analysis.artist.response.ok || !analysis.playlists.response.ok || !analysis.reference.response.ok) {
        const details = formatApiError(analysis);
        throw new Error(details || "Spotify request failed. Please reconnect and try again.");
      }

      const artistData = analysis.artist.data;
      const playlistsData = analysis.playlists.data;
      const refData = analysis.reference.data;

      const targetPlaylists = Array.isArray(playlistsData?.playlists)
        ? playlistsData.playlists.filter(Boolean)
        : [];
      const refPlaylists = Array.isArray(refData?.playlists)
        ? refData.playlists.filter(Boolean)
        : [];
      const computedGaps = computePlaylistGaps(targetPlaylists, refPlaylists);
      const auditResult = buildRoyaltyAudit(computedGaps);

      setArtistSummary(artistData ?? null);
      setPlaylists(targetPlaylists);
      setReferencePlaylists(refPlaylists);
      setGaps(computedGaps);
      setAudit(auditResult);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? `Could not complete Spotify analysis: ${error.message}`
          : "Could not complete Spotify analysis. Please reconnect Spotify and retry."
      );
    }
  }

  if (isRefreshingToken) {
    return (
      <div style={{ padding: 40 }}>
        <h1>VerseIQ</h1>
        <p>Checking your Spotify session...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ padding: 40 }}>
        <h1>VerseIQ</h1>
        <p>Connect to Spotify to start analyzing global gaps.</p>

        {!authorizeUrl ? (
          <p style={{ color: "#ff6b6b" }}>
            Spotify client configuration is missing. Please set NEXT_PUBLIC_SPOTIFY_CLIENT_ID.
          </p>
        ) : null}

        {authorizeUrl ? (
          <a
            href={authorizeUrl}
            style={{
              display: "inline-block",
              padding: "12px 20px",
              background: "#1DB954",
              color: "#fff",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Connect with Spotify
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>VerseIQ Dashboard</h1>
      <p>Basic metadata connection is live. This is your first gap analysis prototype.</p>

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <label>
          Artist ID:{" "}
          <input
            value={artistId}
            onChange={(event) => setArtistId(event.target.value)}
            style={{ width: 260 }}
          />
        </label>
        <br />
        <label>
          Artist Name:{" "}
          <input
            value={artistName}
            onChange={(event) => setArtistName(event.target.value)}
            style={{ width: 260 }}
          />
        </label>
        <br />
        <button onClick={fetchArtistAndPlaylists} style={{ marginTop: 10 }}>
          Run Gap Analysis
        </button>
      </div>

      {errorMessage ? <p style={{ color: "#ff6b6b" }}>{errorMessage}</p> : null}

      {artistSummary ? (
        <div style={{ marginBottom: 24 }}>
          <h2>Artist</h2>
          <p>
            {artistSummary.name} {artistSummary.followers?.total ? `· ${artistSummary.followers.total} followers` : ""}
          </p>
        </div>
      ) : null}

      <h2>Target Playlists</h2>
      <ul>
        {playlists.map((playlist) => (
          <li key={playlist.id}>
            {playlist.name} · {playlist.followers.toLocaleString()} followers · {playlist.ownerName || "Unknown owner"} · {playlist.isEditorial ? "Editorial" : "User/Label"}
          </li>
        ))}
      </ul>

      <h2>Reference Playlists</h2>
      <ul>
        {referencePlaylists.map((playlist) => (
          <li key={playlist.id}>
            {playlist.name} · {playlist.followers.toLocaleString()} followers · {playlist.ownerName || "Unknown owner"} · {playlist.isEditorial ? "Editorial" : "User/Label"}
          </li>
        ))}
      </ul>

      <h2>Gaps (Playlists you&apos;re not in)</h2>
      <ul>
        {gaps.map((playlist) => (
          <li key={playlist.id}>
            {playlist.name} · {playlist.followers.toLocaleString()} followers · {playlist.ownerName || "Unknown owner"} · {playlist.isEditorial ? "Editorial" : "User/Label"}
          </li>
        ))}
      </ul>

      {audit ? (
        <div style={{ marginTop: 40 }}>
          <h2>VerseIQ Royalty Audit Summary</h2>
          <p>
            Estimated unclaimed royalties: EUR {audit.globalMin.toFixed(0)} - EUR {audit.globalMax.toFixed(0)}
          </p>
          <p>Royalty Health Score: {audit.healthScore} / 100</p>

          <h3>Territory Insights</h3>
          <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Territory</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>PRO</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Missing Playlists</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Followers</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Est. Range (EUR)</th>
              </tr>
            </thead>
            <tbody>
              {audit.territoryRows.map((row) => (
                <tr key={row.territory}>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.territory}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.pro}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.playlists}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.followers.toLocaleString()}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>
                    EUR {row.minRoyalty.toFixed(0)} - EUR {row.maxRoyalty.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Estimated Revenue Breakdown</h3>
          <ul>
            <li>
              Streaming gaps: EUR {audit.split.streaming.min.toFixed(0)} - EUR {audit.split.streaming.max.toFixed(0)}
            </li>
            <li>
              Performance royalties: EUR {audit.split.performance.min.toFixed(0)} - EUR {audit.split.performance.max.toFixed(0)}
            </li>
            <li>
              Neighboring rights: EUR {audit.split.neighboring.min.toFixed(0)} - EUR {audit.split.neighboring.max.toFixed(0)}
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}