let spotifyToken: string | null = null;
let spotifyTokenExpiresAt = 0;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const DEBUG = process.env.SPOTIFY_DEBUG === "true";

function assertCredentials() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in environment.");
  }
}

async function fetchSpotifyToken() {
  assertCredentials();

  const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Spotify token error: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };

  spotifyToken = json.access_token;
  spotifyTokenExpiresAt = Date.now() + Math.max(json.expires_in - 60, 30) * 1000;

  if (DEBUG) {
    console.log("[SPOTIFY AUTH] fetched new token, expires in", json.expires_in, "seconds");
  }

  return spotifyToken;
}

export async function getSpotifyToken() {
  if (!spotifyToken || Date.now() >= spotifyTokenExpiresAt) {
    return fetchSpotifyToken();
  }
  return spotifyToken;
}
