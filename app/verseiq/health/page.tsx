import { CatalogHealthReport } from "@/components/CatalogHealthReport";

export default function CatalogHealthPage() {
  return (
    <main className="page-shell">
      <header className="catalog-page__header">
        <h1 className="catalog-page__title">Catalog Health</h1>
        <p className="catalog-page__subtitle">
          Internal completeness checks for your catalog. Errors block downstream actions
          (LODs, statement matching). Warnings reduce confidence but don't block.
        </p>
      </header>

      <CatalogHealthReport />
    </main>
  );
}
