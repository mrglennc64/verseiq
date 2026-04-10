"use client";

import { useEffect, useState } from "react";
import type { CatalogHealthReport, CatalogIssue } from "@/lib/catalogHealth";

const ISSUE_LABELS: Record<CatalogIssue["type"], string> = {
  ARTIST_MISSING_CONTACT: "Artist missing contact info",
  ARTIST_MISSING_SOUNDEXCHANGE_ID: "Artist missing SoundExchange ID",
  ARTIST_NO_RECORDINGS: "Artist has no recordings",
  RECORDING_MISSING_METADATA: "Recording missing metadata",
  RECORDING_NO_SPLITS: "Recording has no splits",
  RECORDING_SPLITS_NOT_100: "Splits don't total 100%",
  RECORDING_NO_ARTIST_SPLIT: "Artist not listed as split participant",
  ARTIST_DUPLICATE_TITLE: "Duplicate title for same artist",
};

function describe(issue: CatalogIssue): string {
  switch (issue.type) {
    case "ARTIST_MISSING_CONTACT":
      return `${issue.artistName} — missing ${issue.missing.join(" + ")}`;
    case "ARTIST_MISSING_SOUNDEXCHANGE_ID":
      return `${issue.artistName} — no SoundExchange ID set`;
    case "ARTIST_NO_RECORDINGS":
      return `${issue.artistName} — no recordings yet`;
    case "RECORDING_MISSING_METADATA":
      return `${issue.artistName} — "${issue.title}" (${issue.isrc}) missing ${issue.missing.join(" + ")}`;
    case "RECORDING_NO_SPLITS":
      return `${issue.artistName} — "${issue.title}" (${issue.isrc}) has no splits`;
    case "RECORDING_SPLITS_NOT_100":
      return `${issue.artistName} — "${issue.title}" (${issue.isrc}) splits total ${issue.total}%`;
    case "RECORDING_NO_ARTIST_SPLIT":
      return `${issue.artistName} — "${issue.title}" (${issue.isrc}) — artist not listed in splits`;
    case "ARTIST_DUPLICATE_TITLE":
      return `${issue.artistName} — "${issue.title}" used by ${issue.isrcs.length} recordings (${issue.isrcs.join(", ")})`;
  }
}

function scoreClass(score: number): string {
  if (score >= 85) return "health-score--good";
  if (score >= 60) return "health-score--ok";
  return "health-score--bad";
}

export function CatalogHealthReport() {
  const [report, setReport] = useState<CatalogHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog/health");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load report");
      setReport(data.report);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="health-card health-card--loading">Computing health…</div>;
  if (error) return <div className="health-card health-card--error">{error}</div>;
  if (!report) return null;

  // Group issues by type for the breakdown
  const grouped = new Map<CatalogIssue["type"], CatalogIssue[]>();
  for (const issue of report.issues) {
    if (!grouped.has(issue.type)) grouped.set(issue.type, []);
    grouped.get(issue.type)!.push(issue);
  }

  return (
    <div className="health-report">
      <section className="health-card health-card--summary">
        <div className={`health-score ${scoreClass(report.score)}`}>{report.score}</div>
        <div className="health-summary">
          <div className="health-summary__title">Catalog health</div>
          <div className="health-summary__meta">
            {report.totals.artists} artists · {report.totals.recordings} recordings ·{" "}
            {report.totals.splits} splits
          </div>
          <div className="health-summary__counts">
            <span className="health-pill health-pill--error">{report.counts.errors} errors</span>
            <span className="health-pill health-pill--warning">
              {report.counts.warnings} warnings
            </span>
          </div>
        </div>
        <button type="button" className="health-refresh" onClick={load}>
          Refresh
        </button>
      </section>

      {report.issues.length === 0 ? (
        <div className="health-card health-card--ok">
          ✓ No issues. Catalog is complete.
        </div>
      ) : (
        Array.from(grouped.entries()).map(([type, issues]) => (
          <section key={type} className="health-card">
            <header className="health-card__header">
              <h3 className="health-card__title">{ISSUE_LABELS[type]}</h3>
              <span
                className={`health-pill health-pill--${issues[0].severity === "error" ? "error" : "warning"}`}
              >
                {issues.length}
              </span>
            </header>
            <ul className="health-issue-list">
              {issues.map((issue, i) => (
                <li key={i} className="health-issue">
                  {describe(issue)}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
