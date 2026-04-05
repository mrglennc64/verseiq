"use client";

import { useEffect, useState } from "react";
import { computePlaylistGaps } from "./gapAnalysis";

export default function VerseIQPage() {
  const [token, setToken] = useState<string | null>(null);
  const [artistId, setArtistId] = useState("");
  const [artistName, setArtistName] = useState("");
  const [artistSummary, setArtistSummary] = useState<any | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [referencePlaylists, setReferencePlaylists] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem("spotify_access_token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ?? "https://heyroya.se/callback";

  const authorizeUrl =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "",
    }).toString();

  async function fetchArtistAndPlaylists() {
    if (!token || !artistId || !artistName) {
      return;
    }

    const [artistRes, playlistsRes, refRes] = await Promise.all([
      fetch(`/api/spotify/artist?id=${artistId}&token=${token}`),
      fetch(`/api/spotify/playlists?artist=${encodeURIComponent(artistName)}&token=${token}`),
      fetch(
        `/api/spotify/playlists?artist=${encodeURIComponent(`${artistName} international`)}&token=${token}`
      ),
    ]);

    const artistData = await artistRes.json();
    const playlistsData = await playlistsRes.json();
    const refData = await refRes.json();

    const targetPlaylists = playlistsData.playlists?.items ?? [];
    const refPlaylists = refData.playlists?.items ?? [];

    setArtistSummary(artistData);
    setPlaylists(targetPlaylists);
    setReferencePlaylists(refPlaylists);
    setGaps(computePlaylistGaps(targetPlaylists, refPlaylists));
  }

  if (!token) {
    return (
      <div style={{ padding: 40 }}>
        <h1>VerseIQ</h1>
        <p>Connect to Spotify to start analyzing global gaps.</p>

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
          <li key={playlist.id}>{playlist.name}</li>
        ))}
      </ul>

      <h2>Reference Playlists</h2>
      <ul>
        {referencePlaylists.map((playlist) => (
          <li key={playlist.id}>{playlist.name}</li>
        ))}
      </ul>

      <h2>Gaps (Playlists you&apos;re not in)</h2>
      <ul>
        {gaps.map((playlist) => (
          <li key={playlist.id}>{playlist.name}</li>
        ))}
      </ul>
    </div>
  );
}