"""
build_master_catalog.py
-----------------------
Merges SoundExchange CSV exports + Spotify catalog export into one
de-duplicated master ISRC catalog.

Usage:
  python build_master_catalog.py

Input files (place in same directory):
  soundexchange_export.csv  — exported via SoundExchange "ADD ALL TO EXPORT"
  spotify_catalog.csv       — Spotify for Artists CSV export

Output:
  master_isrc_catalog.csv   — unique ISRCs across both sources
"""

import pandas as pd
import sys
import os

# ---- INPUT FILES ----
soundexchange_csv = "soundexchange_export.csv"
spotify_csv       = "spotify_catalog.csv"

# ---- LOAD ----
missing = [f for f in [soundexchange_csv, spotify_csv] if not os.path.exists(f)]
if missing:
    print("ERROR: Missing input file(s):", ", ".join(missing))
    sys.exit(1)

se = pd.read_csv(soundexchange_csv)
sp = pd.read_csv(spotify_csv)

print(f"Loaded SoundExchange: {len(se)} rows")
print(f"Loaded Spotify:       {len(sp)} rows")

# ---- NORMALIZE COLUMNS ----
# SoundExchange column mapping (adjust if your export has different headers)
se_col_map = {}
for col in se.columns:
    lower = col.strip().lower()
    if lower == "isrc":              se_col_map[col] = "isrc"
    elif lower == "title":           se_col_map[col] = "title"
    elif lower in ("artist", "artist name"): se_col_map[col] = "artist"
    elif lower in ("release", "album"): se_col_map[col] = "release"
    elif lower in ("release label", "label"): se_col_map[col] = "label"
    elif lower == "upc":             se_col_map[col] = "upc"
se = se.rename(columns=se_col_map)
se["source"] = "soundexchange"

# Spotify column mapping
sp_col_map = {}
for col in sp.columns:
    lower = col.strip().lower()
    if lower == "isrc":              sp_col_map[col] = "isrc"
    elif lower in ("name", "track name", "title"): sp_col_map[col] = "title"
    elif lower in ("artist", "artist name"): sp_col_map[col] = "artist"
    elif lower in ("album", "release"): sp_col_map[col] = "release"
    elif lower == "label":           sp_col_map[col] = "label"
sp = sp.rename(columns=sp_col_map)
sp["source"] = "spotify"

# ---- VALIDATE ISRC COLUMN EXISTS ----
for name, df in [("SoundExchange", se), ("Spotify", sp)]:
    if "isrc" not in df.columns:
        print(f"ERROR: Could not find ISRC column in {name}.")
        print(f"  Available columns: {list(df.columns)}")
        sys.exit(1)

# ---- CLEAN ----
se["isrc"] = se["isrc"].astype(str).str.strip().str.upper()
sp["isrc"] = sp["isrc"].astype(str).str.strip().str.upper()

# Drop rows with no valid ISRC
se = se[se["isrc"].str.match(r'^[A-Z]{2}[A-Z0-9]{3}\d{7}$', na=False)]
sp = sp[sp["isrc"].str.match(r'^[A-Z]{2}[A-Z0-9]{3}\d{7}$', na=False)]

print(f"Valid ISRCs — SoundExchange: {len(se)}  Spotify: {len(sp)}")

# ---- MASTER CATALOG ----
master = pd.concat([se, sp], ignore_index=True).drop_duplicates(subset=["isrc"])
master = master.sort_values("isrc").reset_index(drop=True)

out_path = "master_isrc_catalog.csv"
master.to_csv(out_path, index=False)
print(f"\nMaster ISRC catalog written: {out_path}")
print(f"  Total unique ISRCs: {len(master)}")
