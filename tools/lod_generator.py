"""
lod_generator.py
----------------
Generate a SoundExchange Letter of Direction using missing ISRCs.

Dependencies:
  pip install pandas

Input:
  missing_in_soundexchange.csv

Usage example:
  python lod_generator.py \
    --artist-legal-name "Felix Sandman" \
    --artist-address "Street, City" \
    --artist-email "artist@example.com" \
    --representative-name "Glenn Carter" \
    --representative-entity "TrapRoyaltiesPro / VerseIQ" \
    --fee-percent 20
"""

from __future__ import annotations

import argparse
from datetime import date
import pandas as pd


def generate_soundexchange_lod(
    artist_legal_name: str,
    artist_address: str,
    artist_email: str,
    representative_name: str,
    representative_entity: str,
    fee_percent: int,
    isrcs: list[str],
    lod_date: str | None = None,
) -> str:
    if lod_date is None:
        lod_date = date.today().isoformat()

    return f"""
LETTER OF DIRECTION - SOUNDEXCHANGE

Date: {lod_date}

To: SoundExchange, Inc.

I, {artist_legal_name} (\"Artist\"), hereby authorize {representative_entity},
represented by {representative_name} (\"Representative\"), to act on my behalf
in connection with the registration, administration, and collection of digital
performance royalties payable by SoundExchange for the sound recordings listed
in Appendix A (the \"Recordings\").

1. AUTHORITY
Artist authorizes Representative to:
  - Register the Recordings with SoundExchange;
  - Submit and manage any related claims;
  - Receive statements and payments from SoundExchange relating to the Recordings;
  - Take any actions reasonably necessary to recover past and future royalties.

2. COMPENSATION
Representative shall be entitled to {fee_percent}% of all gross royalties
recovered from SoundExchange in relation to the Recordings, whether paid
retroactively or prospectively, for the duration of this Letter of Direction.

3. TERM
This Letter of Direction shall remain in effect until revoked in writing by Artist,
provided that Representative shall remain entitled to its percentage of any royalties
arising from claims or registrations initiated during the term.

4. NON-ASSIGNMENT OF OWNERSHIP
Nothing in this Letter of Direction transfers ownership of any copyrights or
neighboring rights. Artist retains all ownership; Representative acts solely as
an authorized collection and administration agent.

Artist:
  Name: {artist_legal_name}
  Address: {artist_address}
  Email: {artist_email}

Representative:
  Name: {representative_name}
  Entity: {representative_entity}

APPENDIX A - ISRC LIST
""" + "\n".join(f"  - {i}" for i in isrcs) + f"""

Signed,

______________________________
Artist: {artist_legal_name}

______________________________
Representative: {representative_name} ({representative_entity})
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate SoundExchange LOD")
    parser.add_argument("--missing-isrcs", default="missing_in_soundexchange.csv", help="Missing ISRC CSV")
    parser.add_argument("--artist-legal-name", required=True)
    parser.add_argument("--artist-address", required=True)
    parser.add_argument("--artist-email", required=True)
    parser.add_argument("--representative-name", required=True)
    parser.add_argument("--representative-entity", required=True)
    parser.add_argument("--fee-percent", type=int, default=20)
    parser.add_argument("--out", default=None, help="Output txt file")
    args = parser.parse_args()

    missing_df = pd.read_csv(args.missing_isrcs)
    if "isrc" not in missing_df.columns:
        raise ValueError("Missing ISRC file must contain an isrc column")

    isrcs = (
        missing_df["isrc"]
        .dropna()
        .astype(str)
        .str.strip()
        .str.upper()
        .tolist()
    )

    lod_text = generate_soundexchange_lod(
        artist_legal_name=args.artist_legal_name,
        artist_address=args.artist_address,
        artist_email=args.artist_email,
        representative_name=args.representative_name,
        representative_entity=args.representative_entity,
        fee_percent=args.fee_percent,
        isrcs=isrcs,
    )

    out_path = args.out or f"SoundExchange_LOD_{args.artist_legal_name.replace(' ', '_')}.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(lod_text)

    print(f"LOD written to {out_path}")


if __name__ == "__main__":
    main()
