"use client";

import { useState } from "react";
import { StatementUploadForm } from "@/components/StatementUploadForm";
import { StatementList } from "@/components/StatementList";

export default function StatementsPage() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <main className="page-shell">
      <header className="catalog-page__header">
        <h1 className="catalog-page__title">Statements</h1>
        <p className="catalog-page__subtitle">
          Upload royalty statements from DSPs, PROs, or CMOs. Lines are matched to your
          catalog by ISRC. Unmatched rows and unmatched amounts surface missing revenue.
        </p>
      </header>

      <div className="statements-page__grid">
        <StatementUploadForm onUploaded={() => setReloadKey((k) => k + 1)} />
        <StatementList reloadKey={reloadKey} />
      </div>
    </main>
  );
}
