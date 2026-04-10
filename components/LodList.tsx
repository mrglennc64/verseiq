"use client";

import { useCallback, useEffect, useState } from "react";

type Submission = {
  id: string;
  platform: string;
  packetPath: string;
  status: string;
  note: string | null;
  submittedAt: string;
};

type Lod = {
  id: string;
  artistLegalName: string;
  representativeEntity: string;
  feePercent: number;
  isrcs: string[];
  pdfPath: string;
  pdfHash: string;
  createdAt: string;
  submissions: Submission[];
};

const PLATFORMS: { value: "soundexchange" | "mlc" | "pro"; label: string }[] = [
  { value: "soundexchange", label: "SoundExchange" },
  { value: "mlc", label: "MLC" },
  { value: "pro", label: "PRO" },
];

type Props = {
  reloadKey?: number;
};

export function LodList({ reloadKey }: Props) {
  const [lods, setLods] = useState<Lod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lod");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load LODs");
      setLods(data.lods ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load LODs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const confirmSubmission = async (lod: Lod, platform: string) => {
    const key = `${lod.id}:${platform}`;
    setConfirming(key);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lodId: lod.id,
          platform,
          packetPath: lod.pdfPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to record submission");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to record submission");
    } finally {
      setConfirming(null);
    }
  };

  if (loading) {
    return <div className="lod-list__empty">Loading LODs…</div>;
  }

  if (error) {
    return <div className="lod-list__error">{error}</div>;
  }

  if (lods.length === 0) {
    return <div className="lod-list__empty">No LODs generated yet.</div>;
  }

  return (
    <div className="lod-list">
      {lods.map((lod) => {
        const submittedPlatforms = new Set(lod.submissions.map((s) => s.platform));

        return (
          <article key={lod.id} className="lod-card">
            <header className="lod-card__header">
              <div>
                <h3 className="lod-card__title">{lod.artistLegalName}</h3>
                <p className="lod-card__subtitle">
                  Representative: {lod.representativeEntity} · Fee {lod.feePercent}%
                </p>
              </div>
              <div className="lod-card__meta">
                <div className="lod-card__date">
                  {new Date(lod.createdAt).toLocaleString()}
                </div>
                <div className="lod-card__id">id {lod.id}</div>
              </div>
            </header>

            <div className="lod-card__body">
              <div className="lod-card__row">
                <span className="lod-card__label">PDF</span>
                <code className="lod-card__value">{lod.pdfPath}</code>
              </div>
              <div className="lod-card__row">
                <span className="lod-card__label">sha256</span>
                <code className="lod-card__value lod-card__value--hash">{lod.pdfHash}</code>
              </div>
              <div className="lod-card__row">
                <span className="lod-card__label">ISRCs</span>
                <span className="lod-card__value">{lod.isrcs.length} recordings</span>
              </div>
            </div>

            <div className="lod-card__submissions">
              <h4 className="lod-card__section-title">Submission status</h4>
              <div className="lod-card__platforms">
                {PLATFORMS.map((p) => {
                  const submitted = submittedPlatforms.has(p.value);
                  const key = `${lod.id}:${p.value}`;
                  return (
                    <div key={p.value} className="lod-platform">
                      <div className="lod-platform__name">{p.label}</div>
                      {submitted ? (
                        <div className="lod-platform__status lod-platform__status--ok">
                          Submitted
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="lod-platform__button"
                          disabled={confirming === key}
                          onClick={() => confirmSubmission(lod, p.value)}
                        >
                          {confirming === key ? "Recording…" : "Mark submitted"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {lod.submissions.length > 0 && (
                <ul className="lod-card__history">
                  {lod.submissions.map((s) => (
                    <li key={s.id} className="lod-card__history-item">
                      <span className="lod-card__history-platform">{s.platform}</span>
                      <span className="lod-card__history-date">
                        {new Date(s.submittedAt).toLocaleString()}
                      </span>
                      {s.note && <span className="lod-card__history-note">{s.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
