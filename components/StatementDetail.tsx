"use client";

import { useCallback, useEffect, useState } from "react";

type Line = {
  id: string;
  rawIsrc: string | null;
  rawTitle: string | null;
  rawArtist: string | null;
  rawPeriod: string | null;
  amount: number;
  matched: boolean;
  recording: {
    id: string;
    isrc: string;
    title: string;
    artist: { id: string; legalName: string; stageName: string | null };
  } | null;
};

type Statement = {
  id: string;
  sourcePlatform: string;
  sourceFilename: string;
  uploadedAt: string;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  totalAmount: number;
  unmatchedAmount: number;
  currency: string;
  notes: string | null;
  lines: Line[];
};

type Filter = "all" | "matched" | "unmatched";

export function StatementDetail({ statementId }: { statementId: string }) {
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("unmatched");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/statements/${statementId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load statement");
      setStatement(data.statement);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load statement");
    } finally {
      setLoading(false);
    }
  }, [statementId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="catalog-panel__empty">Loading…</div>;
  if (error) return <div className="catalog-panel__error">{error}</div>;
  if (!statement) return null;

  const matchRate =
    statement.totalRows > 0
      ? Math.round((statement.matchedRows / statement.totalRows) * 100)
      : 0;

  const filtered = statement.lines.filter((l) => {
    if (filter === "matched") return l.matched;
    if (filter === "unmatched") return !l.matched;
    return true;
  });

  return (
    <div className="statement-detail">
      <section className="catalog-panel statement-detail__summary">
        <header className="catalog-panel__header">
          <h2 className="catalog-panel__title">{statement.sourceFilename}</h2>
        </header>
        <div className="statement-detail__meta">
          <span>{statement.sourcePlatform}</span>
          <span>·</span>
          <span>{new Date(statement.uploadedAt).toLocaleString()}</span>
        </div>

        <div className="statement-detail__totals">
          <div className="statement-stat">
            <div className="statement-stat__label">Total</div>
            <div className="statement-stat__value">
              ${statement.totalAmount.toFixed(2)} {statement.currency}
            </div>
          </div>
          <div className="statement-stat">
            <div className="statement-stat__label">Matched</div>
            <div className="statement-stat__value">
              {statement.matchedRows}/{statement.totalRows} ({matchRate}%)
            </div>
          </div>
          <div className="statement-stat">
            <div className="statement-stat__label">Unmatched $</div>
            <div className="statement-stat__value statement-stat__value--danger">
              ${statement.unmatchedAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {statement.notes && (
          <div className="statement-detail__notes">{statement.notes}</div>
        )}
      </section>

      <section className="catalog-panel">
        <header className="catalog-panel__header statement-detail__filter-header">
          <h2 className="catalog-panel__title">Lines</h2>
          <div className="statement-detail__filters">
            {(["unmatched", "matched", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={`statement-filter${filter === f ? " statement-filter--active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="catalog-panel__empty">No {filter} lines.</div>
        ) : (
          <table className="statement-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>ISRC</th>
                <th>Title</th>
                <th>Artist</th>
                <th>Period</th>
                <th className="statement-table__amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((line) => (
                <tr
                  key={line.id}
                  className={line.matched ? "" : "statement-table__row--unmatched"}
                >
                  <td>
                    <span
                      className={`statement-badge statement-badge--${line.matched ? "ok" : "warn"}`}
                    >
                      {line.matched ? "matched" : "unmatched"}
                    </span>
                  </td>
                  <td className="statement-table__mono">{line.rawIsrc ?? "—"}</td>
                  <td>
                    {line.recording?.title ?? line.rawTitle ?? "—"}
                  </td>
                  <td>
                    {line.recording?.artist.legalName ?? line.rawArtist ?? "—"}
                  </td>
                  <td>{line.rawPeriod ?? "—"}</td>
                  <td className="statement-table__amount">
                    ${line.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
