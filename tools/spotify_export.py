"""
spotify_export.py
-----------------
Export an artist catalog from Spotify Web API into spotify_catalog.csv.

Dependencies:
    pip install spotipy

Environment variables:
  SPOTIFY_CLIENT_ID
  SPOTIFY_CLIENT_SECRET

Usage examples:
  python spotify_export.py --artist "Felix Sandman"
  python spotify_export.py --artist "Felix Sandman" --out spotify_catalog.csv
"""

from __future__ import annotations

import argparse
import csv
import getpass
import os
import sys

from spotipy import Spotify
from spotipy.exceptions import SpotifyException
from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOauthError


def get_spotify_client(client_id: str | None = None, client_secret: str | None = None) -> Spotify:
    client_id = client_id or os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = client_secret or os.getenv("SPOTIFY_CLIENT_SECRET")

    if not client_id:
        client_id = input("Spotify Client ID: ").strip()
    if not client_secret:
        client_secret = getpass.getpass("Spotify Client Secret: ").strip()

    if not client_id or not client_secret:
        print("ERROR: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set.")
        sys.exit(1)

    placeholder_values = {
        "your_client_id",
        "your_client_secret",
        "client_id",
        "client_secret",
    }
    if client_id.strip().lower() in placeholder_values or client_secret.strip().lower() in placeholder_values:
        print("ERROR: Placeholder credentials detected.")
        print("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to real values from the Spotify Developer Dashboard.")
        sys.exit(1)

    auth = SpotifyClientCredentials(
        client_id=client_id,
        client_secret=client_secret,
    )
    return Spotify(auth_manager=auth)


def _is_valid_isrc(value: str | None) -> bool:
    if not value:
        return False
    value = str(value).strip().upper()
    if len(value) != 12:
        return False
    country = value[:2]
    registrant = value[2:5]
    year = value[5:7]
    designation = value[7:]
    return country.isalnum() and registrant.isalnum() and year.isdigit() and designation.isdigit()


def fetch_artist_tracks(sp: Spotify, artist_name: str) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    results = sp.search(q=f"artist:{artist_name}", type="artist", limit=1)
    items = results.get("artists", {}).get("items", [])
    if not items:
        raise ValueError(f"Artist not found: {artist_name}")

    artist_id = items[0]["id"]
    tracks = []

    albums = None
    for limit in [20, 10, 5, 1]:
        try:
            albums = sp.artist_albums(
                artist_id,
                album_type="album,single,compilation",
                limit=limit,
            )
            break
        except SpotifyException as exc:
            if "Invalid limit" in str(exc):
                continue
            raise

    if albums is None:
        # Fallback path: some app contexts reject artist_albums pagination entirely.
        fallback_rows = fetch_artist_tracks_via_search(sp, artist_name)
        valid_only = [r for r in fallback_rows if _is_valid_isrc((r.get("isrc") or "").strip().upper())]
        return valid_only, fallback_rows
    seen_albums: set[str] = set()

    while True:
        for album in albums.get("items", []):
            album_id = album.get("id")
            if not album_id or album_id in seen_albums:
                continue
            seen_albums.add(album_id)

            album_full = sp.album(album_id)
            album_name = album_full.get("name")
            album_label = album_full.get("label")
            release_date = album_full.get("release_date")

            for t in album_full.get("tracks", {}).get("items", []):
                external_ids = t.get("external_ids") or {}
                tracks.append(
                    {
                        "artist": ", ".join(a.get("name", "") for a in t.get("artists", [])),
                        "title": t.get("name"),
                        "isrc": external_ids.get("isrc"),
                        "album": album_name,
                        "label": album_label,
                        "release_date": release_date,
                        "spotify_track_id": t.get("id"),
                    }
                )

        if albums.get("next"):
            albums = sp.next(albums)
        else:
            break

    unique: dict[tuple[str, str], dict[str, str]] = {}
    for row in tracks:
        isrc = (row.get("isrc") or "").strip().upper()
        track_id = (row.get("spotify_track_id") or "").strip()
        row["isrc"] = isrc
        unique[(isrc, track_id)] = row

    all_rows = list(unique.values())
    valid_rows = [r for r in all_rows if _is_valid_isrc(r.get("isrc"))]
    return valid_rows, all_rows


def fetch_artist_tracks_via_search(sp: Spotify, artist_name: str) -> list[dict[str, str]]:
    tracks: list[dict[str, str]] = []
    offset = 0
    max_pages = 20
    pages = 0
    seen_track_ids: set[str] = set()

    while pages < max_pages:
        try:
            result = sp.search(
                q=f'artist:"{artist_name}"',
                type="track",
                limit=50,
                offset=offset,
            )
        except SpotifyException as exc:
            if "Invalid limit" in str(exc):
                result = sp.search(
                    q=f'artist:"{artist_name}"',
                    type="track",
                    limit=20,
                    offset=offset,
                )
            else:
                raise
        items = result.get("tracks", {}).get("items", [])
        if not items:
            break

        for t in items:
            track_id = t.get("id")
            if not track_id or track_id in seen_track_ids:
                continue
            seen_track_ids.add(track_id)

            # Search results may omit external_ids; request full track payload.
            try:
                full_t = sp.track(track_id)
            except SpotifyException:
                full_t = t

            external_ids = (full_t or {}).get("external_ids") or {}
            album = t.get("album") or {}
            tracks.append(
                {
                    "artist": ", ".join(a.get("name", "") for a in t.get("artists", [])),
                    "title": t.get("name"),
                    "isrc": external_ids.get("isrc"),
                    "album": album.get("name"),
                    "label": "",
                    "release_date": album.get("release_date"),
                    "spotify_track_id": track_id,
                }
            )

        offset += len(items)
        pages += 1

    unique: dict[tuple[str, str], dict[str, str]] = {}
    for row in tracks:
        isrc = (row.get("isrc") or "").strip().upper()
        track_id = (row.get("spotify_track_id") or "").strip()
        if not _is_valid_isrc(isrc):
            continue
        row["isrc"] = isrc
        unique[(isrc, track_id)] = row

    return list(unique.values())


def write_csv(rows: list[dict[str, str]], out_path: str) -> None:
    fields = [
        "artist",
        "title",
        "isrc",
        "album",
        "label",
        "release_date",
        "spotify_track_id",
    ]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fields})


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Spotify artist catalog")
    parser.add_argument("--artist", required=True, help="Artist name")
    parser.add_argument("--out", default="spotify_catalog.csv", help="Output CSV path")
    parser.add_argument("--client-id", default=None, help="Spotify client ID (optional, otherwise uses SPOTIFY_CLIENT_ID)")
    parser.add_argument("--client-secret", default=None, help="Spotify client secret (optional, otherwise uses SPOTIFY_CLIENT_SECRET)")
    args = parser.parse_args()

    try:
        sp = get_spotify_client(client_id=args.client_id, client_secret=args.client_secret)
        valid_rows, all_rows = fetch_artist_tracks(sp, args.artist)
    except SpotifyOauthError as exc:
        print("ERROR: Spotify authentication failed (invalid_client).")
        print("Check that SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are correct and from the same Spotify app.")
        print(f"Details: {exc}")
        sys.exit(1)

    if not valid_rows:
        print("No tracks with valid ISRC found for this artist.")
        if all_rows:
            write_csv(all_rows, args.out)
            print(f"Wrote {len(all_rows)} tracks without ISRC filtering to {args.out}")
            sys.exit(0)
        print("No tracks returned from Spotify for this artist query.")
        sys.exit(1)

    write_csv(valid_rows, args.out)
    print(f"Exported {len(valid_rows)} tracks to {args.out}")


if __name__ == "__main__":
    main()
