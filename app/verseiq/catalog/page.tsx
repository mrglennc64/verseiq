"use client";

import { useState } from "react";
import { ArtistPanel } from "@/components/ArtistPanel";
import { RecordingPanel } from "@/components/RecordingPanel";
import { SplitPanel } from "@/components/SplitPanel";

export default function CatalogPage() {
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);

  return (
    <main className="page-shell">
      <header className="catalog-page__header">
        <h1 className="catalog-page__title">Catalog</h1>
        <p className="catalog-page__subtitle">
          Add artists, recordings, and splits. Everything else (LODs, registrations,
          reconciliation) reads from this catalog.
        </p>
      </header>

      <div className="catalog-page__grid">
        <ArtistPanel
          selectedArtistId={selectedArtistId}
          onSelect={(id) => {
            setSelectedArtistId(id);
            setSelectedRecordingId(null);
          }}
        />
        <RecordingPanel
          artistId={selectedArtistId}
          selectedRecordingId={selectedRecordingId}
          onSelect={setSelectedRecordingId}
        />
        <SplitPanel recordingId={selectedRecordingId} />
      </div>
    </main>
  );
}
