"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type StatementRow = {
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
};

type Props = {
  reloadKey?: number;
};

export function StatementList({ reloadKey }: Props) {
  const [statements, setStatements] = useState<StatementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/statements");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load statements");
      setStatements(data.statements ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load statements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return (
    <section className="catalog-panel">
      <header className="catalog-panel__header">
        <h2 className="catalog-panel__title">Statements</h2>
      </header>

      {error && <div className="catalog-panel__error">{error}</div>}

      <div className="catalog-panel__list">
        {loading ? (
          <div className="catalog-panel__empty">Loading…</div>
        ) : statements.length === 0 ? (
          <div className="catalog-panel__empty">No statements uploaded yet.</div>
        ) : (
          statements.map((s) => {
            const matchRate =
              s.totalRows > 0 ? Math.round((s.matchedRows / s.totalRows) * 100) : 0;
            return (
              <Link key={s.id} href={`/verseiq/statements/${s.id}`} className="statement-row">
                <div className="statement-row__main">
                  <div className="statement-row__title">{s.sourceFilename}</div>
                  <div className="statement-row__subtitle">
                    {s.sourcePlatform} · {new Date(s.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="statement-row__stats">
                  <div className="statement-row__amount">
                    ${s.totalAmount.toFixed(2)} {s.currency}
                  </div>
                  <div className="statement-row__match">
                    {s.matchedRows}/{s.totalRows} matched ({matchRate}%)
                  </div>
                  {s.unmatchedAmount > 0 && (
                    <div className="statement-row__unmatched">
                      ${s.unmatchedAmount.toFixed(2)} unmatched
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
