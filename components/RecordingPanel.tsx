"use client";

import { useCallback, useEffect, useState } from "react";

export type Split = {
  id: string;
  participantName: string;
  role: string;
  percentage: number;
};

export type Recording = {
  id: string;
  artistId: string;
  isrc: string;
  title: string;
  releaseDate: string | null;
  label: string | null;
  upc: string | null;
  splits: Split[];
};

type Props = {
  artistId: string | null;
  selectedRecordingId: string | null;
  onSelect: (recordingId: string) => void;
};

export function RecordingPanel({ artistId, selectedRecordingId, onSelect }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isrc, setIsrc] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [spotifyArtist, setSpotifyArtist] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!artistId) {
      setRecordings([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recordings?artistId=${artistId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load recordings");
      setRecordings(data.recordings ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistId) return;
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await fetch("/api/recordings/import-spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, spotifyArtist }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Import failed");
      const name = data.spotifyArtistName ? ` for ${data.spotifyArtistName}` : "";
      setImportResult(
        `Imported ${data.created} new ISRCs${name} ` +
          `(${data.albumsScanned} albums scanned, ` +
          `${data.isrcsFound} ISRCs found, ${data.skippedExisting} already in catalog).`,
      );
      setSpotifyArtist("");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, isrc, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create recording");
      setIsrc("");
      setTitle("");
      await load();
      onSelect(data.recording.id);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create recording");
    } finally {
      setSubmitting(false);
    }
  };

  if (!artistId) {
    return (
      <section className="catalog-panel">
        <header className="catalog-panel__header">
          <h2 className="catalog-panel__title">Recordings</h2>
        </header>
        <div className="catalog-panel__empty">Select an artist to see recordings.</div>
      </section>
    );
  }

  return (
    <section className="catalog-panel">
      <header className="catalog-panel__header">
        <h2 className="catalog-panel__title">Recordings</h2>
        <button
          type="button"
          className="catalog-form__link"
          onClick={() => {
            setShowImport((v) => !v);
            setImportResult(null);
          }}
        >
          {showImport ? "Cancel import" : "Import from Spotify"}
        </button>
      </header>

      {showImport && (
        <form className="catalog-form" onSubmit={handleImport}>
          <input
            className="catalog-form__input"
            placeholder="Spotify artist URL or ID"
            value={spotifyArtist}
            onChange={(e) => setSpotifyArtist(e.target.value)}
            required
          />
          <button
            type="submit"
            className="catalog-form__submit"
            disabled={importing || !spotifyArtist.trim()}
          >
            {importing ? "Importing… (may take a minute)" : "Fetch all ISRCs"}
          </button>
          {importResult && (
            <div className="catalog-panel__success">{importResult}</div>
          )}
        </form>
      )}

      <form className="catalog-form catalog-form--inline" onSubmit={handleSubmit}>
        <input
          className="catalog-form__input"
          placeholder="ISRC (e.g. USRC12345678) *"
          value={isrc}
          onChange={(e) => setIsrc(e.target.value.toUpperCase())}
          required
        />
        <input
          className="catalog-form__input"
          placeholder="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <button type="submit" className="catalog-form__submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add recording"}
        </button>
      </form>

      {error && <div className="catalog-panel__error">{error}</div>}

      <div className="catalog-panel__list">
        {loading ? (
          <div className="catalog-panel__empty">Loading…</div>
        ) : recordings.length === 0 ? (
          <div className="catalog-panel__empty">No recordings for this artist.</div>
        ) : (
          recordings.map((rec) => {
            const selected = rec.id === selectedRecordingId;
            const totalSplits = rec.splits.reduce((s, x) => s + x.percentage, 0);
            return (
              <button
                key={rec.id}
                type="button"
                onClick={() => onSelect(rec.id)}
                className={`catalog-row${selected ? " catalog-row--selected" : ""}`}
              >
                <div className="catalog-row__main">
                  <div className="catalog-row__title">{rec.title}</div>
                  <div className="catalog-row__subtitle">
                    <code>{rec.isrc}</code>
                  </div>
                </div>
                <div className="catalog-row__meta">
                  {rec.splits.length} splits · {totalSplits}%
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
