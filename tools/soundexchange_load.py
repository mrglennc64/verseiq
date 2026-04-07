"""
soundexchange_load.py
---------------------
Normalize SoundExchange CSV export into soundexchange_normalized.csv.

Dependencies:
  pip install pandas

Usage:
  python soundexchange_load.py --in soundexchange_export.csv --out soundexchange_normalized.csv
"""

from __future__ import annotations

import argparse
import pandas as pd


def load_soundexchange(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    rename_map = {
        "ISRC": "isrc",
        "Title": "title",
        "Artist": "artist",
        "Release": "release",
        "Release Label": "label",
        "UPC": "upc",
    }
    df = df.rename(columns=rename_map)

    if "isrc" not in df.columns:
        raise ValueError("ISRC column not found in SoundExchange CSV")

    df["isrc"] = df["isrc"].astype(str).str.strip().str.upper()
    df = df[df["isrc"].str.match(r"^[A-Z]{2}[A-Z0-9]{3}\d{7}$", na=False)].copy()
    df = df.drop_duplicates(subset=["isrc"]).reset_index(drop=True)
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize SoundExchange export")
    parser.add_argument("--in", dest="input_path", default="soundexchange_export.csv", help="Input CSV")
    parser.add_argument("--out", dest="output_path", default="soundexchange_normalized.csv", help="Output CSV")
    args = parser.parse_args()

    se = load_soundexchange(args.input_path)
    se.to_csv(args.output_path, index=False)
    print(f"Loaded {len(se)} normalized rows to {args.output_path}")


if __name__ == "__main__":
    main()
