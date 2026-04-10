"use client";

import { useCallback, useEffect, useState } from "react";
import type { Split } from "./RecordingPanel";

type Props = {
  recordingId: string | null;
};

export function SplitPanel({ recordingId }: Props) {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [participantName, setParticipantName] = useState("");
  const [role, setRole] = useState("performer");
  const [percentage, setPercentage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!recordingId) {
      setSplits([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/splits?recordingId=${recordingId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load splits");
      setSplits(data.splits ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load splits");
    } finally {
      setLoading(false);
    }
  }, [recordingId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordingId,
          participantName,
          role,
          percentage: Number(percentage),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create split");
      setParticipantName("");
      setPercentage("");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create split");
    } finally {
      setSubmitting(false);
    }
  };

  if (!recordingId) {
    return (
      <section className="catalog-panel">
        <header className="catalog-panel__header">
          <h2 className="catalog-panel__title">Splits</h2>
        </header>
        <div className="catalog-panel__empty">Select a recording to manage splits.</div>
      </section>
    );
  }

  const total = splits.reduce((s, x) => s + x.percentage, 0);
  const remaining = Math.max(0, 100 - total);

  return (
    <section className="catalog-panel">
      <header className="catalog-panel__header">
        <h2 className="catalog-panel__title">Splits</h2>
        <div className="catalog-panel__total">
          {total}% allocated · {remaining}% remaining
        </div>
      </header>

      <form className="catalog-form catalog-form--inline" onSubmit={handleSubmit}>
        <input
          className="catalog-form__input"
          placeholder="Participant name *"
          value={participantName}
          onChange={(e) => setParticipantName(e.target.value)}
          required
        />
        <select
          className="catalog-form__input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="performer">Performer</option>
          <option value="featured">Featured</option>
          <option value="producer">Producer</option>
          <option value="writer">Writer</option>
          <option value="publisher">Publisher</option>
        </select>
        <input
          className="catalog-form__input"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="% *"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          required
        />
        <button type="submit" className="catalog-form__submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add split"}
        </button>
      </form>

      {error && <div className="catalog-panel__error">{error}</div>}

      <div className="catalog-panel__list">
        {loading ? (
          <div className="catalog-panel__empty">Loading…</div>
        ) : splits.length === 0 ? (
          <div className="catalog-panel__empty">No splits yet.</div>
        ) : (
          splits.map((s) => (
            <div key={s.id} className="catalog-row catalog-row--static">
              <div className="catalog-row__main">
                <div className="catalog-row__title">{s.participantName}</div>
                <div className="catalog-row__subtitle">{s.role}</div>
              </div>
              <div className="catalog-row__meta">{s.percentage}%</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
