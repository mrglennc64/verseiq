"""
find_soundexchange_gaps.py
--------------------------
Forensic comparison: Spotify DSP catalog vs SoundExchange catalog.
Identifies ISRCs present on DSP but NOT claimed in SoundExchange.

Usage:
  python find_soundexchange_gaps.py

Input files (same directory):
  soundexchange_export.csv
  spotify_catalog_enriched.csv (preferred) or spotify_catalog.csv

Output:
  missing_in_soundexchange.csv
  present_in_soundexchange.csv
  se_not_in_spotify.csv
  gap_report.txt
"""

import csv
import os
import re
import sys
from datetime import date

soundexchange_csv = "soundexchange_export.csv"
spotify_candidates = ["spotify_catalog_enriched.csv", "spotify_catalog.csv"]


def choose_spotify_file() -> str | None:
    for path in spotify_candidates:
        if os.path.exists(path):
            return path
    return None


def is_valid_isrc(value: str) -> bool:
    v = (value or "").strip().upper()
    return bool(re.match(r"^[A-Z]{2}[A-Z0-9]{3}\d{7}$", v))


def normalize_key(raw: str) -> str:
    return raw.strip().lower()


def load_rows(path: str) -> list[dict[str, str]]:
    with open(path, "r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def normalize_isrc_rows(rows: list[dict[str, str]], source_name: str) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for row in rows:
        key_map = {normalize_key(k): (k, v) for k, v in row.items()}
        isrc = (key_map.get("isrc", (None, ""))[1] or "").strip().upper()
        if not is_valid_isrc(isrc):
            continue

        title = ""
        artist = ""
        release = ""
        label = ""
        upc = ""

        for k in ["title", "name", "track name"]:
            if k in key_map:
                title = (key_map[k][1] or "").strip()
                break
        for k in ["artist", "artist name"]:
            if k in key_map:
                artist = (key_map[k][1] or "").strip()
                break
        for k in ["album", "release"]:
            if k in key_map:
                release = (key_map[k][1] or "").strip()
                break
        for k in ["label", "release label"]:
            if k in key_map:
                label = (key_map[k][1] or "").strip()
                break
        if "upc" in key_map:
            upc = (key_map["upc"][1] or "").strip()

        out.append(
            {
                "isrc": isrc,
                "title": title,
                "artist": artist,
                "release": release,
                "label": label,
                "upc": upc,
            }
        )

    if not out:
        print(f"WARNING: No valid ISRC rows found in {source_name}")
    return out


def index_by_isrc(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    indexed: dict[str, dict[str, str]] = {}
    for row in rows:
        indexed[row["isrc"]] = row
    return indexed


def write_csv(path: str, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    spotify_csv = choose_spotify_file()
    missing_inputs = []
    if not os.path.exists(soundexchange_csv):
        missing_inputs.append(soundexchange_csv)
    if not spotify_csv:
        missing_inputs.append("spotify_catalog_enriched.csv or spotify_catalog.csv")

    if missing_inputs:
        print("ERROR: Missing input file(s):", ", ".join(missing_inputs))
        sys.exit(1)

    se_raw = load_rows(soundexchange_csv)
    sp_raw = load_rows(spotify_csv)

    print(f"Loaded SoundExchange: {len(se_raw)} rows")
    print(f"Loaded Spotify:       {len(sp_raw)} rows (from {spotify_csv})")

    se = normalize_isrc_rows(se_raw, "SoundExchange")
    sp = normalize_isrc_rows(sp_raw, "Spotify")

    print(f"Valid ISRCs - SoundExchange: {len(se)}  Spotify: {len(sp)}")

    se_isrcs = set(row["isrc"] for row in se)
    sp_isrcs = set(row["isrc"] for row in sp)

    missing_in_se = sorted(sp_isrcs - se_isrcs)
    present_in_se = sorted(sp_isrcs & se_isrcs)
    orphan_in_se = sorted(se_isrcs - sp_isrcs)

    sp_index = index_by_isrc(sp)

    missing_rows: list[dict[str, str]] = []
    for isrc in missing_in_se:
        base = sp_index.get(isrc, {})
        missing_rows.append(
            {
                "isrc": isrc,
                "title": base.get("title", ""),
                "artist": base.get("artist", ""),
                "release": base.get("release", ""),
                "label": base.get("label", ""),
                "upc": base.get("upc", ""),
            }
        )

    present_rows: list[dict[str, str]] = []
    for isrc in present_in_se:
        base = sp_index.get(isrc, {})
        present_rows.append(
            {
                "isrc": isrc,
                "title": base.get("title", ""),
                "artist": base.get("artist", ""),
                "release": base.get("release", ""),
                "label": base.get("label", ""),
                "upc": base.get("upc", ""),
            }
        )

    orphan_rows = [{"isrc": isrc} for isrc in orphan_in_se]

    write_csv(
        "missing_in_soundexchange.csv",
        missing_rows,
        ["isrc", "title", "artist", "release", "label", "upc"],
    )
    write_csv(
        "present_in_soundexchange.csv",
        present_rows,
        ["isrc", "title", "artist", "release", "label", "upc"],
    )
    write_csv("se_not_in_spotify.csv", orphan_rows, ["isrc"])

    gap_pct = round((len(missing_in_se) / len(sp_isrcs) * 100), 1) if sp_isrcs else 0
    report = f"""
=============================================================
  SOUNDEXCHANGE GAP REPORT - {date.today().isoformat()}
=============================================================

DSP CATALOG (Spotify)         : {len(sp_isrcs)} ISRCs
SoundExchange Registered      : {len(se_isrcs)} ISRCs

GAPS (on DSP, NOT in SE)      : {len(missing_in_se)} ISRCs  [{gap_pct}% of DSP catalog]
CONFIRMED (on DSP AND in SE)  : {len(present_in_se)} ISRCs
SE ORPHANS (SE not on Spotify): {len(orphan_in_se)} ISRCs

-------------------------------------------------------------
OUTPUT FILES
  missing_in_soundexchange.csv  -> {len(missing_in_se)} claimable ISRCs
  present_in_soundexchange.csv  -> {len(present_in_se)} confirmed ISRCs
  se_not_in_spotify.csv         -> {len(orphan_in_se)} orphan ISRCs (verify)

-------------------------------------------------------------
MISSING ISRCs (top 20 preview)
"""

    for i, isrc in enumerate(missing_in_se[:20]):
        row = sp_index.get(isrc, {})
        title = row.get("title", "-")
        artist = row.get("artist", "-")
        report += f"  {i + 1:>2}. {isrc}  {title}  -  {artist}\n"

    if len(missing_in_se) > 20:
        report += f"  ... and {len(missing_in_se) - 20} more - see missing_in_soundexchange.csv\n"

    report += "=============================================================\n"

    with open("gap_report.txt", "w", encoding="utf-8") as f:
        f.write(report)

    print(report)
    print("Files written: missing_in_soundexchange.csv, present_in_soundexchange.csv, se_not_in_spotify.csv, gap_report.txt")


if __name__ == "__main__":
    main()
