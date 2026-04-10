"use client";

import { useEffect, useState } from "react";

type Props = {
  onCreated?: () => void;
};

type Artist = {
  id: string;
  legalName: string;
  stageName: string | null;
  address: string | null;
  email: string | null;
};

type TenantSettings = {
  defaultRepName: string | null;
  defaultRepEntity: string | null;
  defaultFeePercent: number | null;
};

type Recording = {
  id: string;
  isrc: string;
  title: string;
};

export function LodGeneratorForm({ onCreated }: Props) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);

  const [artistId, setArtistId] = useState("");
  const [artistAddress, setArtistAddress] = useState("");
  const [artistEmail, setArtistEmail] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [representativeEntity, setRepresentativeEntity] = useState("");
  const [feePercent, setFeePercent] = useState("15");
  const [selectedIsrcs, setSelectedIsrcs] = useState<Set<string>>(new Set());
  const [saveAsDefaults, setSaveAsDefaults] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; pdfHash: string; pdfPath: string } | null>(
    null
  );

  // Load artists + tenant settings once.
  useEffect(() => {
    fetch("/api/artists")
      .then((r) => r.json())
      .then((d) => setArtists(d.artists ?? []))
      .catch(() => setArtists([]));

    fetch("/api/tenant/settings")
      .then((r) => r.json())
      .then((d) => {
        const s: TenantSettings | null = d.settings ?? null;
        if (s) {
          if (s.defaultRepName) setRepresentativeName(s.defaultRepName);
          if (s.defaultRepEntity) setRepresentativeEntity(s.defaultRepEntity);
          if (s.defaultFeePercent != null) setFeePercent(String(s.defaultFeePercent));
        }
      })
      .catch(() => {});
  }, []);

  // Auto-fill artist contact when artist changes.
  useEffect(() => {
    if (!artistId) return;
    const a = artists.find((x) => x.id === artistId);
    if (a) {
      setArtistAddress(a.address ?? "");
      setArtistEmail(a.email ?? "");
    }
  }, [artistId, artists]);

  // Load recordings whenever artist changes.
  useEffect(() => {
    if (!artistId) {
      setRecordings([]);
      setSelectedIsrcs(new Set());
      return;
    }
    setLoadingRecordings(true);
    fetch(`/api/recordings?artistId=${artistId}`)
      .then((r) => r.json())
      .then((d) => setRecordings(d.recordings ?? []))
      .catch(() => setRecordings([]))
      .finally(() => setLoadingRecordings(false));
    setSelectedIsrcs(new Set());
  }, [artistId]);

  const toggleIsrc = (isrc: string) => {
    setSelectedIsrcs((prev) => {
      const next = new Set(prev);
      if (next.has(isrc)) next.delete(isrc);
      else next.add(isrc);
      return next;
    });
  };

  const selectAll = () => setSelectedIsrcs(new Set(recordings.map((r) => r.isrc)));
  const clearAll = () => setSelectedIsrcs(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const artist = artists.find((a) => a.id === artistId);
    if (!artist) {
      setError("Pick an artist");
      setSubmitting(false);
      return;
    }
    if (selectedIsrcs.size === 0) {
      setError("Select at least one recording");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/lod/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistLegalName: artist.legalName,
          artistAddress,
          artistEmail,
          representativeName,
          representativeEntity,
          feePercent: Number(feePercent),
          isrcs: Array.from(selectedIsrcs),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate LOD");

      setResult({ id: data.id, pdfHash: data.pdfHash, pdfPath: data.pdfPath });
      setSelectedIsrcs(new Set());

      if (saveAsDefaults) {
        await fetch("/api/tenant/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultRepName: representativeName,
            defaultRepEntity: representativeEntity,
            defaultFeePercent: Number(feePercent),
          }),
        }).catch(() => {});
      }

      onCreated?.();
    } catch (err: any) {
      setError(err?.message ?? "Failed to generate LOD");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="lod-form-card">
      <div className="lod-form-card__header">
        <h2 className="lod-form-card__title">Generate Letter of Direction</h2>
        <p className="lod-form-card__subtitle">
          Pick an artist and recordings from your catalog. The LOD is rendered to PDF,
          sha256-hashed, and stored for audit.
        </p>
      </div>

      <form className="lod-form" onSubmit={handleSubmit}>
        <label className="lod-form__field">
          <span className="lod-form__label">Artist</span>
          <select
            className="lod-form__input"
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            required
          >
            <option value="">— Select artist —</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.legalName}
                {a.stageName ? ` (aka ${a.stageName})` : ""}
              </option>
            ))}
          </select>
          {artists.length === 0 && (
            <span className="lod-form__hint">
              No artists yet. Add one in the <a href="/verseiq/catalog">catalog</a>.
            </span>
          )}
        </label>

        <div className="lod-form__row">
          <label className="lod-form__field">
            <span className="lod-form__label">Artist email</span>
            <input
              className="lod-form__input"
              type="email"
              value={artistEmail}
              onChange={(e) => setArtistEmail(e.target.value)}
              required
            />
          </label>
          <label className="lod-form__field">
            <span className="lod-form__label">Artist address</span>
            <input
              className="lod-form__input"
              value={artistAddress}
              onChange={(e) => setArtistAddress(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="lod-form__row">
          <label className="lod-form__field">
            <span className="lod-form__label">Representative name</span>
            <input
              className="lod-form__input"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              required
            />
          </label>
          <label className="lod-form__field">
            <span className="lod-form__label">Representative entity</span>
            <input
              className="lod-form__input"
              value={representativeEntity}
              onChange={(e) => setRepresentativeEntity(e.target.value)}
              required
            />
          </label>
        </div>

        <label className="lod-form__field">
          <span className="lod-form__label">Fee percent (of gross recovered)</span>
          <input
            className="lod-form__input"
            type="number"
            min="0"
            max="50"
            step="0.1"
            value={feePercent}
            onChange={(e) => setFeePercent(e.target.value)}
            required
          />
        </label>

        <label className="lod-form__checkbox">
          <input
            type="checkbox"
            checked={saveAsDefaults}
            onChange={(e) => setSaveAsDefaults(e.target.checked)}
          />
          <span>Save representative + fee as defaults for future LODs</span>
        </label>

        <div className="lod-form__field">
          <div className="lod-form__recordings-header">
            <span className="lod-form__label">Recordings to include</span>
            {recordings.length > 0 && (
              <div className="lod-form__recordings-actions">
                <button type="button" className="lod-form__link" onClick={selectAll}>
                  Select all
                </button>
                <button type="button" className="lod-form__link" onClick={clearAll}>
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="lod-form__recordings">
            {!artistId ? (
              <div className="lod-form__empty">Pick an artist first.</div>
            ) : loadingRecordings ? (
              <div className="lod-form__empty">Loading recordings…</div>
            ) : recordings.length === 0 ? (
              <div className="lod-form__empty">
                No recordings for this artist. Add some in the{" "}
                <a href="/verseiq/catalog">catalog</a>.
              </div>
            ) : (
              recordings.map((rec) => (
                <label key={rec.id} className="lod-form__recording">
                  <input
                    type="checkbox"
                    checked={selectedIsrcs.has(rec.isrc)}
                    onChange={() => toggleIsrc(rec.isrc)}
                  />
                  <span className="lod-form__recording-isrc">{rec.isrc}</span>
                  <span className="lod-form__recording-title">{rec.title}</span>
                </label>
              ))
            )}
          </div>
          {recordings.length > 0 && (
            <div className="lod-form__hint">{selectedIsrcs.size} selected</div>
          )}
        </div>

        <div className="lod-form__actions">
          <button type="submit" className="lod-form__submit" disabled={submitting}>
            {submitting ? "Generating…" : "Generate LOD PDF"}
          </button>
        </div>

        {error && <div className="lod-form__error">{error}</div>}
        {result && (
          <div className="lod-form__success">
            <div>LOD created — id <code>{result.id}</code></div>
            <div className="lod-form__hash">sha256: {result.pdfHash}</div>
            <div>Saved to <code>{result.pdfPath}</code></div>
          </div>
        )}
      </form>
    </section>
  );
}
