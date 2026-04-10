"use client";

import { useState } from "react";
import { LodGeneratorForm } from "@/components/LodGeneratorForm";
import { LodList } from "@/components/LodList";

export default function LodPage() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <main className="page-shell">
      <header className="lod-page__header">
        <h1 className="lod-page__title">Letter of Direction</h1>
        <p className="lod-page__subtitle">
          Generate SoundExchange-compliant LODs, hash them for forensic audit, and track
          manual submission to SoundExchange, MLC, and PROs.
        </p>
      </header>

      <div className="lod-page__grid">
        <LodGeneratorForm onCreated={() => setReloadKey((k) => k + 1)} />
        <LodList reloadKey={reloadKey} />
      </div>
    </main>
  );
}
