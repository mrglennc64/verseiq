"""
audit_pdf.py
------------
Build a full audit report from CSV outputs.

Dependencies:
  Required: pandas
  Optional: weasyprint (for PDF output)

Usage:
  python audit_pdf.py

Inputs:
  missing_in_soundexchange.csv
  present_in_soundexchange.csv
  missing_in_pro.csv

Outputs:
  VerseIQ_Full_Audit.pdf   (if weasyprint installed)
  VerseIQ_Full_Audit.html  (always)
"""

from __future__ import annotations

import html
from pathlib import Path

import pandas as pd


def _list_items(series: pd.Series) -> str:
    if series.empty:
        return "<li>None</li>"
    return "".join(f"<li>{html.escape(str(v))}</li>" for v in series.dropna())


def render_us_section(missing_in_se_path: str, present_in_se_path: str) -> str:
    missing = pd.read_csv(missing_in_se_path)
    present = pd.read_csv(present_in_se_path)

    return f"""
<h1>VerseIQ - US Royalty Audit</h1>

<h2>1. SoundExchange Gaps</h2>
<p>ISRCs on DSP (Spotify) but not in SoundExchange:</p>
<ul>
{_list_items(missing.get('isrc', pd.Series(dtype=str)))}
</ul>

<h2>2. ISRCs Present in SoundExchange</h2>
<ul>
{_list_items(present.get('isrc', pd.Series(dtype=str)))}
</ul>
"""


def render_pro_section(missing_in_pro_path: str) -> str:
    missing = pd.read_csv(missing_in_pro_path)
    return f"""
<h1>VerseIQ - PRO Publishing Audit</h1>

<h2>1. Works Missing in PRO Repertoire (by title)</h2>
<ul>
{_list_items(missing.get('title_norm', pd.Series(dtype=str)))}
</ul>
"""


def build_full_html(us_html: str, pro_html: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>VerseIQ Royalty Audit</title>
  <style>
    body {{ font-family: Arial, sans-serif; font-size: 12px; margin: 24px; }}
    h1, h2 {{ margin-top: 16px; }}
    ul {{ margin-left: 16px; }}
    hr {{ margin: 24px 0; }}
  </style>
</head>
<body>
{us_html}
<hr/>
{pro_html}
</body>
</html>
"""


def main() -> None:
    us_html = render_us_section("missing_in_soundexchange.csv", "present_in_soundexchange.csv")
    pro_html = render_pro_section("missing_in_pro.csv")
    full_html = build_full_html(us_html, pro_html)

    html_path = Path("VerseIQ_Full_Audit.html")
    html_path.write_text(full_html, encoding="utf-8")
    print(f"HTML written to {html_path}")

    try:
        from weasyprint import HTML

        pdf_path = Path("VerseIQ_Full_Audit.pdf")
        HTML(string=full_html).write_pdf(str(pdf_path))
        print(f"PDF written to {pdf_path}")
    except Exception as exc:
        print("PDF skipped (install weasyprint to enable PDF output).")
        print(f"Reason: {exc}")


if __name__ == "__main__":
    main()
