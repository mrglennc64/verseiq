"""
pro_load.py
-----------
Normalize PRO repertoire export (GEMA/PRS/STIM/etc.) into pro_normalized.csv.

Dependencies:
  pip install pandas

Usage:
  python pro_load.py --in gema_export.csv --out pro_normalized.csv
"""

from __future__ import annotations

import argparse
import pandas as pd


def load_pro(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = df.rename(
        columns={
            "Title": "title",
            "Writer": "writer",
            "Publisher": "publisher",
            "ISWC": "iswc",
        }
    )

    if "title" not in df.columns:
        raise ValueError("Title column not found in PRO CSV")

    df["title_norm"] = df["title"].astype(str).str.lower().str.strip()
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize PRO export")
    parser.add_argument("--in", dest="input_path", default="gema_export.csv", help="Input CSV")
    parser.add_argument("--out", dest="output_path", default="pro_normalized.csv", help="Output CSV")
    args = parser.parse_args()

    pro = load_pro(args.input_path)
    pro.to_csv(args.output_path, index=False)
    print(f"Loaded {len(pro)} rows to {args.output_path}")


if __name__ == "__main__":
    main()
