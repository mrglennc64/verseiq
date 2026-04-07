import base64
import os
import time

import requests
from fastapi import FastAPI, HTTPException

SPOTIFY_CLIENT_ID = os.environ["SPOTIFY_CLIENT_ID"]
SPOTIFY_CLIENT_SECRET = os.environ["SPOTIFY_CLIENT_SECRET"]

app = FastAPI()

_token = None
_token_expires_at = 0


def get_spotify_token():
    global _token, _token_expires_at

    if _token and time.time() < _token_expires_at:
        return _token

    basic = base64.b64encode(
        f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode("ascii")
    ).decode("ascii")

    resp = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {basic}"},
        data={"grant_type": "client_credentials"},
        timeout=20,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Spotify token error: {resp.text}")

    data = resp.json()
    _token = data["access_token"]
    _token_expires_at = time.time() + data["expires_in"] - 60
    return _token


def spotify_get(path: str, params=None):
    token = get_spotify_token()
    resp = requests.get(
        f"https://api.spotify.com/v1{path}",
        headers={"Authorization": f"Bearer {token}"},
        params=params or {},
        timeout=30,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@app.get("/health")
def health():
    token = get_spotify_token()
    return {"ok": True, "token_present": bool(token)}


@app.get("/artist-catalog")
def artist_catalog(artist_id: str):
    artist = spotify_get(f"/artists/{artist_id}")
    albums_res = spotify_get(
        f"/artists/{artist_id}/albums",
        {
            "include_groups": "album,single,appears_on,compilation",
            "limit": 50,
        },
    )
    albums = albums_res.get("items", [])
    tracks = []

    for album in albums:
        tracks_res = spotify_get(f"/albums/{album['id']}/tracks", {"limit": 50})
        for t in tracks_res.get("items", []):
            tracks.append(
                {
                    "track_id": t.get("id"),
                    "track_name": t.get("name"),
                    "isrc": (t.get("external_ids") or {}).get("isrc"),
                    "album_id": album.get("id"),
                    "album_name": album.get("name"),
                    "release_date": album.get("release_date"),
                }
            )

    return {
        "artist": {
            "id": artist["id"],
            "name": artist["name"],
            "genres": artist.get("genres", []),
            "popularity": artist.get("popularity"),
        },
        "albums": [
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "release_date": a.get("release_date"),
                "total_tracks": a.get("total_tracks"),
            }
            for a in albums
        ],
        "tracks": tracks,
    }
