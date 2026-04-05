"use client";

import { useEffect, useMemo, useState } from "react";
import { computePlaylistGaps } from "./gapAnalysis";
import { PRO_SEARCH_URL_BY_TERRITORY, type PlaylistMetadata } from "./territory";
import { buildRoyaltyAudit } from "./audit";
import { computePlaylistValueScore } from "./valueScore";

type ArtistSearchResult = {
  id: string;
  name: string;
  followers: number;
  popularity: number;
};

type RightsProbeRow = {
  title: string;
  artist: string;
  isrc: string | null;
  hasRecording: boolean;
  hasWork: boolean;
  hasIswc: boolean;
  likelyGap: string;
  needsManualProCheck: boolean;
  soundexchangeStatus: string;
};

type RightsProbeResult = {
  artistName: string;
  summary: {
    checkedTracks: number;
    missingIsrc: number;
    missingIswc: number;
    needsManualProCheck: number;
  };
  tracks: RightsProbeRow[];
};

type IssueFlags = {
  missingWork: boolean;
  wrongWriter: boolean;
  wrongPublisher: boolean;
  wrongShares: boolean;
};

type USProbeTrackRow = {
  isrc: string;
  missingInSoundExchange: boolean;
  usPlaylistFollowers: number;
  usRadioLinkedPlaylists: number;
  score: number;
};

type USProbeResult = {
  artistName: string;
  date: string;
  feePercent: number;
  inputCounts: {
    tracks: number;
    usPlaylists: number;
  };
  audit: {
    artistName: string;
    tracks: USProbeTrackRow[];
    totalEstimatedRange: { min: number; max: number };
    feeRange: { min: number; max: number };
  };
  artistScore: {
    artistName: string;
    recoveryPotentialScore: number;
  };
  seGaps: Array<{
    isrc: string;
    reason: string;
  }>;
  lod: string;
};

export default function VerseIQPage() {
  const [token, setToken] = useState<string | null>(null);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistId, setArtistId] = useState("");
  const [artistName, setArtistName] = useState("");
  const [artistMatches, setArtistMatches] = useState<ArtistSearchResult[]>([]);
  const [isSearchingArtists, setIsSearchingArtists] = useState(false);
  const [artistSummary, setArtistSummary] = useState<any | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistMetadata[]>([]);
  const [referencePlaylists, setReferencePlaylists] = useState<PlaylistMetadata[]>([]);
  const [gaps, setGaps] = useState<PlaylistMetadata[]>([]);
  const [audit, setAudit] = useState<ReturnType<typeof buildRoyaltyAudit> | null>(null);
  const [isRunningProbe, setIsRunningProbe] = useState(false);
  const [isRunningUsProbe, setIsRunningUsProbe] = useState(false);
  const [probeResult, setProbeResult] = useState<RightsProbeResult | null>(null);
  const [usProbeResult, setUsProbeResult] = useState<USProbeResult | null>(null);
  const [probeIssueFlags, setProbeIssueFlags] = useState<Record<number, IssueFlags>>({});
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

  async function fetchAnalysisData(accessToken: string, nameForPlaylists: string) {
    const [artistRes, playlistsRes, refRes] = await Promise.all([
      fetch(`/api/spotify/artist?id=${artistId}&token=${accessToken}`),
      fetch(`/api/spotify/playlists?artist=${encodeURIComponent(nameForPlaylists)}&token=${accessToken}`),
      fetch(
        `/api/spotify/playlists?artist=${encodeURIComponent(`${nameForPlaylists} international`)}&token=${accessToken}`
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

  async function searchArtists() {
    if (!token) {
      setErrorMessage("Connect Spotify first before searching artists.");
      return;
    }

    const query = artistQuery.trim();
    if (query.length < 2) {
      setErrorMessage("Type at least 2 characters to search artists.");
      return;
    }

    setErrorMessage(null);
    setIsSearchingArtists(true);
    try {
      const res = await fetch(
        `/api/spotify/artists?q=${encodeURIComponent(query)}&token=${encodeURIComponent(token)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details || data?.error || `Artist search failed (HTTP ${res.status})`);
      }

      const matches = Array.isArray(data?.artists) ? data.artists : [];
      setArtistMatches(
        matches.sort(
          (a: ArtistSearchResult, b: ArtistSearchResult) =>
            b.followers - a.followers || b.popularity - a.popularity
        )
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? `Artist search failed: ${error.message}` : "Artist search failed."
      );
    } finally {
      setIsSearchingArtists(false);
    }
  }

  function selectArtist(artist: ArtistSearchResult) {
    setArtistId(artist.id);
    setArtistName(artist.name);
    setArtistQuery(artist.name);
    setArtistMatches([]);
    setErrorMessage(null);
  }

  async function fetchArtistAndPlaylists() {
    setErrorMessage(null);

    if (!token || !artistId) {
      setErrorMessage("Please provide Artist ID before running analysis.");
      return;
    }

    try {
      let effectiveArtistName = artistName.trim();

      // If user selected/pasted only Artist ID, resolve the artist name automatically.
      if (!effectiveArtistName) {
        const artistLookupRes = await fetch(`/api/spotify/artist?id=${artistId}&token=${token}`);
        const artistLookupData = await artistLookupRes.json().catch(() => ({}));
        if (!artistLookupRes.ok || !artistLookupData?.name) {
          throw new Error("Could not resolve artist name from Artist ID.");
        }
        effectiveArtistName = artistLookupData.name;
        setArtistName(effectiveArtistName);
      }

      let analysis = await fetchAnalysisData(token, effectiveArtistName);

      const hasUnauthorized = [analysis.artist, analysis.playlists, analysis.reference].some(
        (entry) => entry.response.status === 401
      );

      if (hasUnauthorized) {
        const refreshedToken = await refreshAccessTokenIfPossible();
        if (refreshedToken) {
          analysis = await fetchAnalysisData(refreshedToken, effectiveArtistName);
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
      setProbeResult(null);
      setUsProbeResult(null);
      setProbeIssueFlags({});
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? `Could not complete Spotify analysis: ${error.message}`
          : "Could not complete Spotify analysis. Please reconnect Spotify and retry."
      );
    }
  }

  const scoredGaps = useMemo(() => {
    return gaps
      .map((playlist) => {
        const value = computePlaylistValueScore(playlist, artistName);
        return { playlist, value };
      })
      .sort((a, b) => b.value.score - a.value.score);
  }, [gaps, artistName]);

  function collectProbeTracks() {
    const seen = new Set<string>();

    const tracks = scoredGaps
      .flatMap(({ playlist }) => (Array.isArray(playlist.tracks) ? playlist.tracks : []))
      .filter((track) => track?.title && track?.artist)
      .filter((track) => {
        const key = `${track.title.toLowerCase()}::${track.artist.toLowerCase()}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, 20)
      .map((track) => ({
        title: track.title,
        artist: track.artist,
        isrc: track.isrc,
      }));

    return tracks;
  }

  async function runRightsProbe() {
    const probeTracks = collectProbeTracks();
    const effectiveArtistName = artistSummary?.name || artistName || "Unknown artist";

    if (probeTracks.length === 0) {
      setErrorMessage("No track snippets available in gap playlists for rights probing yet.");
      return;
    }

    setErrorMessage(null);
    setIsRunningProbe(true);

    try {
      const res = await fetch("/api/gap-finder/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistName: effectiveArtistName, tracks: probeTracks }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details || data?.error || `Probe failed (HTTP ${res.status})`);
      }

      setProbeResult(data as RightsProbeResult);
      setUsProbeResult(null);
      setProbeIssueFlags({});
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? `Rights probe failed: ${error.message}` : "Rights probe failed."
      );
    } finally {
      setIsRunningProbe(false);
    }
  }

  async function runUSProbe() {
    if (!probeResult) {
      setErrorMessage("Run Rights Probe first so ISRC-resolved tracks are available.");
      return;
    }

    const artist = artistSummary?.name || artistName || "Unknown artist";
    const tracksForUS = probeResult.tracks
      .filter((track) => track.isrc)
      .map((track) => ({
        isrc: track.isrc,
        title: track.title,
        artist: track.artist,
      }));

    if (tracksForUS.length === 0) {
      setErrorMessage("US Probe requires at least one track with a resolved ISRC.");
      return;
    }

    const soundExchangeMatches = probeResult.tracks
      .filter((track) => track.isrc)
      .map((track) => {
        const status = (track.soundexchangeStatus || "").toLowerCase();
        const found = status.includes("found") || status.includes("registered");
        return {
          isrc: track.isrc as string,
          found,
          title: track.title,
          artist: track.artist,
        };
      });

    setErrorMessage(null);
    setIsRunningUsProbe(true);

    try {
      const res = await fetch("/api/us-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName: artist,
          tracks: tracksForUS,
          playlists: gaps,
          soundExchangeMatches,
          feePercent: 20,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.details || data?.error || `US Probe failed (HTTP ${res.status})`);
      }

      setUsProbeResult(data as USProbeResult);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "US Probe failed.");
    } finally {
      setIsRunningUsProbe(false);
    }
  }

  function downloadUSLod() {
    if (!usProbeResult?.lod) {
      return;
    }

    const blob = new Blob([usProbeResult.lod], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verseiq-soundexchange-lod-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadProbeCsv() {
    if (!probeResult) {
      return;
    }

    const headers = [
      "title",
      "artist",
      "isrc",
      "hasRecording",
      "hasWork",
      "hasIswc",
      "likelyGap",
      "needsManualProCheck",
      "soundexchangeStatus",
      "missingWork",
      "wrongWriter",
      "wrongPublisher",
      "wrongShares",
    ];

    const rows = probeResult.tracks.map((row, index) => {
      const flags = getIssueFlags(index, row);
      return [
      row.title,
      row.artist,
      row.isrc || "",
      String(row.hasRecording),
      String(row.hasWork),
      String(row.hasIswc),
      row.likelyGap,
      String(row.needsManualProCheck),
      row.soundexchangeStatus,
      String(flags.missingWork),
      String(flags.wrongWriter),
      String(flags.wrongPublisher),
      String(flags.wrongShares),
    ];
    });

    const csv = [headers, ...rows]
      .map((line) =>
        line
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verseiq-rights-probe-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getIssueFlags(index: number, row: RightsProbeRow): IssueFlags {
    const current = probeIssueFlags[index];
    if (current) {
      return current;
    }

    const likely = (row.likelyGap || "").toLowerCase();
    return {
      missingWork: likely.includes("no linked work") || likely.includes("no recording match"),
      wrongWriter: false,
      wrongPublisher: false,
      wrongShares: likely.includes("iswc missing"),
    };
  }

  function toggleIssueFlag(index: number, row: RightsProbeRow, key: keyof IssueFlags) {
    setProbeIssueFlags((prev) => {
      const current = prev[index] ?? getIssueFlags(index, row);
      return {
        ...prev,
        [index]: {
          ...current,
          [key]: !current[key],
        },
      };
    });
  }

  async function downloadPdfReport() {
    if (!audit) {
      return;
    }

    try {
      const res = await fetch("/api/report/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName: artistSummary?.name || artistName || "Unknown artist",
          mode: usProbeResult ? "us" : "global",
          usProbe: usProbeResult,
          audit,
          probe: probeResult,
          issueFlags: probeIssueFlags,
          feePct: 0.2,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.details || error?.error || `PDF failed (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verseiq-audit-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? `PDF download failed: ${error.message}` : "PDF download failed."
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
          Artist Search: {" "}
          <input
            value={artistQuery}
            onChange={(event) => setArtistQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchArtists();
              }
            }}
            style={{ width: 260 }}
            placeholder="Search by artist name"
          />
        </label>
        <button onClick={searchArtists} style={{ marginLeft: 8 }} disabled={isSearchingArtists}>
          {isSearchingArtists ? "Searching..." : "Search"}
        </button>
        {artistMatches.length > 0 ? (
          <ul style={{ marginTop: 8, marginBottom: 12, maxWidth: 720 }}>
            {artistMatches.map((artist) => (
              <li key={artist.id} style={{ marginBottom: 6 }}>
                <span>
                  {artist.name} · {artist.followers.toLocaleString()} followers · popularity {artist.popularity}
                </span>{" "}
                <button type="button" onClick={() => selectArtist(artist)} style={{ cursor: "pointer" }}>
                  Select
                </button>
              </li>
            ))}
          </ul>
        ) : null}

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
        {scoredGaps.map(({ playlist, value }) => (
          <li key={playlist.id}>
            Value score {value.score}/100 · Territory {value.territory} · {" "}
            {playlist.name} · {playlist.followers.toLocaleString()} followers · {playlist.ownerName || "Unknown owner"} · {playlist.isEditorial ? "Editorial" : "User/Label"}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <button onClick={runRightsProbe} disabled={isRunningProbe}>
          {isRunningProbe ? "Running Rights Probe..." : "Run Rights Probe"}
        </button>
        <button
          onClick={runUSProbe}
          disabled={isRunningUsProbe || !probeResult}
          style={{ marginLeft: 8 }}
        >
          {isRunningUsProbe ? "Running US Probe..." : "Run US Probe"}
        </button>
        {probeResult ? (
          <button onClick={downloadProbeCsv} style={{ marginLeft: 8 }}>
            Export Rights Probe CSV
          </button>
        ) : null}
        {audit ? (
          <button onClick={downloadPdfReport} style={{ marginLeft: 8 }}>
            Download PDF Report
          </button>
        ) : null}
      </div>

      {probeResult ? (
        <div style={{ marginTop: 8 }}>
          <h3>Rights Probe Summary</h3>
          <p>
            Checked tracks: {probeResult.summary.checkedTracks} · Missing ISRC: {probeResult.summary.missingIsrc} · Missing ISWC: {probeResult.summary.missingIswc} · Manual checks: {probeResult.summary.needsManualProCheck}
          </p>

          <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Track</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Artist</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>ISRC</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Recording</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Work</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>ISWC</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Likely Gap</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Issue Checks</th>
              </tr>
            </thead>
            <tbody>
              {probeResult.tracks.map((row, idx) => (
                <tr key={`${row.title}-${row.artist}-${idx}`}>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.title}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.artist}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.isrc || "-"}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.hasRecording ? "Yes" : "No"}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.hasWork ? "Yes" : "No"}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.hasIswc ? "Yes" : "No"}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>
                    {row.likelyGap}
                    {row.needsManualProCheck ? "  <- manual PRO check" : ""}
                  </td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>
                    {(["missingWork", "wrongWriter", "wrongPublisher", "wrongShares"] as const).map((key) => {
                      const flags = getIssueFlags(idx, row);
                      const active = flags[key];
                      const label =
                        key === "missingWork"
                          ? "Missing work"
                          : key === "wrongWriter"
                          ? "Wrong writer"
                          : key === "wrongPublisher"
                          ? "Wrong publisher"
                          : "Wrong shares";
                      return (
                        <button
                          key={`${idx}-${key}`}
                          type="button"
                          onClick={() => toggleIssueFlag(idx, row, key)}
                          style={{
                            marginRight: 6,
                            marginBottom: 4,
                            cursor: "pointer",
                            borderRadius: 4,
                            border: "1px solid #355",
                            background: active ? "#1b4f2e" : "#111a2a",
                            color: "#dce7ff",
                            padding: "2px 6px",
                            fontSize: 11,
                          }}
                        >
                          {active ? "[x]" : "[ ]"} {label}
                        </button>
                      );
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {usProbeResult ? (
        <div style={{ marginTop: 28 }}>
          <h2>US Priority Audit</h2>
          <p>
            US recovery potential score: {usProbeResult.artistScore.recoveryPotentialScore} / 100
          </p>
          <p>
            Estimated unclaimed US royalties: EUR {usProbeResult.audit.totalEstimatedRange.min.toFixed(0)} - EUR {usProbeResult.audit.totalEstimatedRange.max.toFixed(0)}
          </p>
          <p>
            Estimated fee ({usProbeResult.feePercent}%): EUR {usProbeResult.audit.feeRange.min.toFixed(0)} - EUR {usProbeResult.audit.feeRange.max.toFixed(0)}
          </p>
          <p>
            Inputs used: {usProbeResult.inputCounts.tracks} ISRC tracks, {usProbeResult.inputCounts.usPlaylists} US playlists
          </p>

          {usProbeResult.seGaps.length > 0 ? (
            <>
              <h3>SoundExchange Missing Registrations</h3>
              <ul>
                {usProbeResult.seGaps.map((gap) => (
                  <li key={gap.isrc}>
                    {gap.isrc}: {gap.reason}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>No SoundExchange registration gaps found for provided ISRCs.</p>
          )}

          <button onClick={downloadUSLod}>Download SoundExchange LOD</button>
        </div>
      ) : null}

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
                <th style={{ textAlign: "left", borderBottom: "1px solid #334", padding: "8px 6px" }}>Manual PRO Check</th>
              </tr>
            </thead>
            <tbody>
              {audit.territoryRows.map((row) => (
                <tr key={row.territory}>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.territory}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>
                    {PRO_SEARCH_URL_BY_TERRITORY[row.territory] ? (
                      <a
                        href={PRO_SEARCH_URL_BY_TERRITORY[row.territory]}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#9ad0ff" }}
                      >
                        {row.pro}
                      </a>
                    ) : (
                      row.pro
                    )}
                  </td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.playlists}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>{row.followers.toLocaleString()}</td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>
                    EUR {row.minRoyalty.toFixed(0)} - EUR {row.maxRoyalty.toFixed(0)}
                    {row.needsManualProCheck ? "  <- manual PRO check" : ""}
                  </td>
                  <td style={{ borderBottom: "1px solid #223", padding: "8px 6px" }}>
                    {row.needsManualProCheck ? "Yes" : "No"}
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

          <h3>Manual PRO Check Checklist</h3>
          <ul>
            {audit.territoryRows.filter((row) => row.needsManualProCheck).length === 0 ? (
              <li>No manual PRO checks required for this run.</li>
            ) : (
              audit.territoryRows
                .filter((row) => row.needsManualProCheck)
                .map((row) => (
                  <li key={`check-${row.territory}`}>
                    {row.territory} ({row.pro}): check repertoire for {artistSummary?.name || artistName || "selected artist"} and key works.
                  </li>
                ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}