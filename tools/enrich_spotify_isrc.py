"""
enrich_spotify_isrc.py
----------------------
Enrich Spotify catalog rows missing ISRC by querying public metadata APIs.

Sources used:
- Deezer search API (fast track metadata lookup)
- MusicBrainz recording search API (fallback)

Usage:
  python enrich_spotify_isrc.py --in spotify_catalog.csv --out spotify_catalog_enriched.csv

Outputs:
- spotify_catalog_enriched.csv
- spotify_catalog_unresolved.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import time
import urllib.parse
import urllib.request
from typing import Any

USER_AGENT = "VerseIQ-ISRC-Enricher/1.0 (contact: support@useverseiq.com)"


def is_valid_isrc(value: str | None) -> bool:
    if not value:
        return False
    v = value.strip().upper()
    if len(v) != 12:
        return False
    return v[:2].isalnum() and v[2:5].isalnum() and v[5:7].isdigit() and v[7:].isdigit()


def _http_json(url: str, timeout: int = 20) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return json.loads(raw)


def lookup_isrc_deezer(artist: str, title: str) -> str | None:
    q = urllib.parse.quote(f'{artist} {title}')
    url = f"https://api.deezer.com/search?q={q}"
    try:
        data = _http_json(url)
    except Exception:
        return None

    rows = data.get("data") or []
    for row in rows[:10]:
        isrc = (row.get("isrc") or "").strip().upper()
        if is_valid_isrc(isrc):
            return isrc
    return None


def lookup_isrc_musicbrainz(artist: str, title: str) -> str | None:
    query = f'recording:"{title}" AND artist:"{artist}"'
    q = urllib.parse.quote(query)
    url = f"https://musicbrainz.org/ws/2/recording/?query={q}&fmt=json&limit=10"
    try:
        data = _http_json(url)
    except Exception:
        return None

    recs = data.get("recordings") or []
    for rec in recs:
        isrcs = rec.get("isrcs") or []
        for isrc in isrcs:
            cand = str(isrc).strip().upper()
            if is_valid_isrc(cand):
                return cand
    return None


def normalize_artist_title(row: dict[str, str]) -> tuple[str, str]:
    artist = (row.get("artist") or "").strip()
    title = (row.get("title") or "").strip()

    # If artist contains featured artist list, keep primary artist first token.
    if "," in artist:
        artist = artist.split(",", 1)[0].strip()

    return artist, title


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich Spotify catalog with ISRCs")
    parser.add_argument("--in", dest="in_path", default="spotify_catalog.csv", help="Input Spotify catalog CSV")
    parser.add_argument("--out", dest="out_path", default="spotify_catalog_enriched.csv", help="Output enriched CSV")
    parser.add_argument("--unresolved", dest="unresolved_path", default="spotify_catalog_unresolved.csv", help="Rows still missing ISRC")
    parser.add_argument("--sleep-ms", dest="sleep_ms", type=int, default=250, help="Delay between API requests")
    args = parser.parse_args()

    with open(args.in_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])

    if "isrc" not in fieldnames:
        fieldnames.append("isrc")

    enriched_count = 0
    already_count = 0
    unresolved: list[dict[str, str]] = []

    for row in rows:
        current_isrc = (row.get("isrc") or "").strip().upper()
        if is_valid_isrc(current_isrc):
            row["isrc"] = current_isrc
            already_count += 1
            continue

        artist, title = normalize_artist_title(row)
        resolved = None

        if artist and title:
            resolved = lookup_isrc_deezer(artist, title)
            time.sleep(args.sleep_ms / 1000.0)

        if not resolved and artist and title:
            resolved = lookup_isrc_musicbrainz(artist, title)
            time.sleep(args.sleep_ms / 1000.0)

        if resolved:
            row["isrc"] = resolved
            enriched_count += 1
        else:
            row["isrc"] = ""
            unresolved.append(row)

    with open(args.out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    with open(args.unresolved_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(unresolved)

    print(f"Input rows: {len(rows)}")
    print(f"Already had valid ISRC: {already_count}")
    print(f"Newly enriched ISRC: {enriched_count}")
    print(f"Still missing ISRC: {len(unresolved)}")
    print(f"Enriched file: {args.out_path}")
    print(f"Unresolved file: {args.unresolved_path}")


if __name__ == "__main__":
    main()
