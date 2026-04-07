"""
run_full_audit.py
-----------------
One-command orchestrator for the VerseIQ forensic audit pipeline.

This script runs:
1) spotify_export.py
2) soundexchange_load.py
3) pro_load.py
4) diff_engine.py
5) lod_generator.py
6) audit_pdf.py

Dependencies:
  pip install pandas spotipy
Optional for PDF:
  pip install weasyprint

Usage example:
python run_full_audit.py \
  --artist "Felix Sandman" \
  --soundexchange-csv soundexchange_export.csv \
  --pro-csv gema_export.csv \
  --artist-legal-name "Felix Sandman" \
  --artist-address "Street, City" \
  --artist-email "artist@example.com" \
  --representative-name "Glenn Carter" \
  --representative-entity "TrapRoyaltiesPro / VerseIQ" \
  --fee-percent 20
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run_step(cmd: list[str], step_name: str) -> None:
    print(f"\n[STEP] {step_name}")
    print("[CMD]", " ".join(cmd))
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        print(f"\nERROR: Step failed: {step_name} (exit code {result.returncode})")
        sys.exit(result.returncode)


def ensure_file_exists(path: str, label: str) -> None:
    p = Path(path)
    if not p.exists() or not p.is_file():
        print(f"ERROR: {label} not found: {path}")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run full Spotify + SoundExchange + PRO forensic audit")

    parser.add_argument("--artist", required=True, help="Spotify artist name")
    parser.add_argument("--spotify-out", default="spotify_catalog.csv", help="Spotify output CSV")

    parser.add_argument("--soundexchange-csv", required=True, help="Raw SoundExchange export CSV")
    parser.add_argument("--soundexchange-normalized", default="soundexchange_normalized.csv", help="Normalized SE CSV")

    parser.add_argument("--pro-csv", required=True, help="Raw PRO export CSV (GEMA/PRS/STIM etc.)")
    parser.add_argument("--pro-normalized", default="pro_normalized.csv", help="Normalized PRO CSV")

    parser.add_argument("--artist-legal-name", required=True)
    parser.add_argument("--artist-address", required=True)
    parser.add_argument("--artist-email", required=True)
    parser.add_argument("--representative-name", required=True)
    parser.add_argument("--representative-entity", required=True)
    parser.add_argument("--fee-percent", type=int, default=20)

    parser.add_argument("--skip-spotify", action="store_true", help="Skip Spotify export (use existing spotify_out file)")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    py = sys.executable

    ensure_file_exists(args.soundexchange_csv, "SoundExchange CSV")
    ensure_file_exists(args.pro_csv, "PRO CSV")

    if not args.skip_spotify:
        run_step(
            [
                py,
                str(script_dir / "spotify_export.py"),
                "--artist",
                args.artist,
                "--out",
                args.spotify_out,
            ],
            "Export Spotify catalog",
        )
    else:
        ensure_file_exists(args.spotify_out, "Spotify catalog CSV")

    run_step(
        [
            py,
            str(script_dir / "soundexchange_load.py"),
            "--in",
            args.soundexchange_csv,
            "--out",
            args.soundexchange_normalized,
        ],
        "Normalize SoundExchange export",
    )

    run_step(
        [
            py,
            str(script_dir / "pro_load.py"),
            "--in",
            args.pro_csv,
            "--out",
            args.pro_normalized,
        ],
        "Normalize PRO export",
    )

    run_step(
        [
            py,
            str(script_dir / "diff_engine.py"),
            "--spotify",
            args.spotify_out,
            "--soundexchange",
            args.soundexchange_normalized,
            "--pro",
            args.pro_normalized,
        ],
        "Build gap diff outputs",
    )

    run_step(
        [
            py,
            str(script_dir / "lod_generator.py"),
            "--missing-isrcs",
            "missing_in_soundexchange.csv",
            "--artist-legal-name",
            args.artist_legal_name,
            "--artist-address",
            args.artist_address,
            "--artist-email",
            args.artist_email,
            "--representative-name",
            args.representative_name,
            "--representative-entity",
            args.representative_entity,
            "--fee-percent",
            str(args.fee_percent),
        ],
        "Generate SoundExchange LOD",
    )

    run_step(
        [py, str(script_dir / "audit_pdf.py")],
        "Generate full audit HTML/PDF",
    )

    print("\nPipeline complete.")
    print("Outputs:")
    print("- spotify_catalog.csv")
    print("- soundexchange_normalized.csv")
    print("- pro_normalized.csv")
    print("- missing_in_soundexchange.csv")
    print("- present_in_soundexchange.csv")
    print("- missing_in_pro.csv")
    print("- SoundExchange_LOD_<Artist>.txt")
    print("- VerseIQ_Full_Audit.html")
    print("- VerseIQ_Full_Audit.pdf (if weasyprint is installed)")


if __name__ == "__main__":
    main()
