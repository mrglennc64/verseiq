"""
diff_engine.py
--------------
Compare Spotify catalog against SoundExchange + PRO repertoire.

Dependencies:
  pip install pandas

Inputs:
  spotify_catalog.csv
  soundexchange_export.csv (or soundexchange_normalized.csv)
  pro_normalized.csv

Outputs:
  missing_in_soundexchange.csv
  present_in_soundexchange.csv
  missing_in_pro.csv
"""

from __future__ import annotations

import argparse
import pandas as pd


def load_spotify(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "isrc" not in df.columns or "title" not in df.columns:
        raise ValueError("Spotify CSV must contain at least: isrc, title")

    df["isrc"] = df["isrc"].astype(str).str.strip().str.upper()
    df["title_norm"] = df["title"].astype(str).str.lower().str.strip()
    df = df[df["isrc"].str.match(r"^[A-Z]{2}[A-Z0-9]{3}\d{7}$", na=False)].copy()
    return df


def load_soundexchange(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "isrc" not in df.columns:
        df = df.rename(columns={"ISRC": "isrc", "Title": "title"})

    if "isrc" not in df.columns:
        raise ValueError("SoundExchange CSV must contain ISRC/isrc")

    if "title" not in df.columns:
        df["title"] = ""

    df["isrc"] = df["isrc"].astype(str).str.strip().str.upper()
    df["title_norm"] = df["title"].astype(str).str.lower().str.strip()
    df = df[df["isrc"].str.match(r"^[A-Z]{2}[A-Z0-9]{3}\d{7}$", na=False)].copy()
    return df


def load_pro(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "title_norm" not in df.columns:
        if "title" not in df.columns:
            raise ValueError("PRO CSV must contain title or title_norm")
        df["title_norm"] = df["title"].astype(str).str.lower().str.strip()
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Find SoundExchange and PRO gaps")
    parser.add_argument("--spotify", default="spotify_catalog.csv", help="Spotify catalog CSV")
    parser.add_argument("--soundexchange", default="soundexchange_export.csv", help="SoundExchange CSV")
    parser.add_argument("--pro", default="pro_normalized.csv", help="Normalized PRO CSV")
    args = parser.parse_args()

    sp = load_spotify(args.spotify)
    se = load_soundexchange(args.soundexchange)
    pro = load_pro(args.pro)

    se_isrcs = set(se["isrc"])
    sp_isrcs = set(sp["isrc"])

    missing_in_se = sorted(sp_isrcs - se_isrcs)
    present_in_se = sorted(sp_isrcs & se_isrcs)

    missing_se_df = sp[sp["isrc"].isin(missing_in_se)].drop_duplicates(subset=["isrc"])
    present_se_df = sp[sp["isrc"].isin(present_in_se)].drop_duplicates(subset=["isrc"])

    missing_se_df.to_csv("missing_in_soundexchange.csv", index=False)
    present_se_df.to_csv("present_in_soundexchange.csv", index=False)

    print(f"Missing in SoundExchange: {len(missing_in_se)}")
    print(f"Present in SoundExchange: {len(present_in_se)}")

    pro_titles = set(pro["title_norm"].dropna().astype(str))
    master_titles = set(sp["title_norm"].dropna().astype(str))

    missing_in_pro_titles = sorted(master_titles - pro_titles)
    pd.DataFrame({"title_norm": missing_in_pro_titles}).to_csv("missing_in_pro.csv", index=False)

    print(f"Missing in PRO (by title): {len(missing_in_pro_titles)}")


if __name__ == "__main__":
    main()
