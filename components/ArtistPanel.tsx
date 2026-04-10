"use client";

import { useCallback, useEffect, useState } from "react";

export type Artist = {
  id: string;
  legalName: string;
  stageName: string | null;
  address: string | null;
  email: string | null;
  soundexchangeId: string | null;
  mlcId: string | null;
  proAffiliation: string | null;
  _count?: { recordings: number };
};

type Props = {
  selectedArtistId: string | null;
  onSelect: (artistId: string) => void;
  reloadKey?: number;
};

export function ArtistPanel({ selectedArtistId, onSelect, reloadKey }: Props) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [legalName, setLegalName] = useState("");
  const [stageName, setStageName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [soundexchangeId, setSoundexchangeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Inline edit state for the currently expanded artist.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const beginEdit = (artist: Artist) => {
    setEditingId(artist.id);
    setEditAddress(artist.address ?? "");
    setEditEmail(artist.email ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAddress("");
    setEditEmail("");
  };

  const saveEdit = async (artistId: string) => {
    setEditSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/artists/${artistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: editAddress || null,
          email: editEmail || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update artist");
      await load();
      cancelEdit();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update artist");
    } finally {
      setEditSaving(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/artists");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load artists");
      setArtists(data.artists ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load artists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName,
          stageName: stageName || undefined,
          address: address || undefined,
          email: email || undefined,
          soundexchangeId: soundexchangeId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create artist");
      setLegalName("");
      setStageName("");
      setAddress("");
      setEmail("");
      setSoundexchangeId("");
      await load();
      onSelect(data.artist.id);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create artist");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="catalog-panel">
      <header className="catalog-panel__header">
        <h2 className="catalog-panel__title">Artists</h2>
      </header>

      <form className="catalog-form" onSubmit={handleSubmit}>
        <input
          className="catalog-form__input"
          placeholder="Legal name *"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          required
        />
        <input
          className="catalog-form__input"
          placeholder="Stage name (optional)"
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
        />
        <input
          className="catalog-form__input"
          placeholder="Address (optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <input
          className="catalog-form__input"
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="catalog-form__input"
          placeholder="SoundExchange ID (optional)"
          value={soundexchangeId}
          onChange={(e) => setSoundexchangeId(e.target.value)}
        />
        <button type="submit" className="catalog-form__submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add artist"}
        </button>
      </form>

      {error && <div className="catalog-panel__error">{error}</div>}

      <div className="catalog-panel__list">
        {loading ? (
          <div className="catalog-panel__empty">Loading…</div>
        ) : artists.length === 0 ? (
          <div className="catalog-panel__empty">No artists yet.</div>
        ) : (
          artists.map((artist) => {
            const selected = artist.id === selectedArtistId;
            const editing = editingId === artist.id;
            const missingContact = !artist.address || !artist.email;
            return (
              <div key={artist.id} className="catalog-artist-row">
                <button
                  type="button"
                  onClick={() => onSelect(artist.id)}
                  className={`catalog-row${selected ? " catalog-row--selected" : ""}`}
                >
                  <div className="catalog-row__main">
                    <div className="catalog-row__title">{artist.legalName}</div>
                    {artist.stageName && (
                      <div className="catalog-row__subtitle">aka {artist.stageName}</div>
                    )}
                    {missingContact && (
                      <div className="catalog-row__warning">missing address/email</div>
                    )}
                  </div>
                  <div className="catalog-row__meta">
                    {artist._count?.recordings ?? 0} recordings
                  </div>
                </button>

                {selected && !editing && (
                  <button
                    type="button"
                    className="catalog-form__link"
                    onClick={() => beginEdit(artist)}
                  >
                    Edit contact
                  </button>
                )}

                {editing && (
                  <div className="catalog-edit">
                    <input
                      className="catalog-form__input"
                      placeholder="Address"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    />
                    <input
                      className="catalog-form__input"
                      type="email"
                      placeholder="Email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                    <div className="catalog-edit__actions">
                      <button
                        type="button"
                        className="catalog-form__submit"
                        disabled={editSaving}
                        onClick={() => saveEdit(artist.id)}
                      >
                        {editSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="catalog-form__link"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
