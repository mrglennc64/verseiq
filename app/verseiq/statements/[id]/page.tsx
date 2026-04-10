import Link from "next/link";
import { StatementDetail } from "@/components/StatementDetail";

export default function StatementDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="page-shell">
      <header className="catalog-page__header">
        <Link href="/verseiq/statements" className="catalog-form__link">
          ← Back to statements
        </Link>
        <h1 className="catalog-page__title">Statement</h1>
      </header>

      <StatementDetail statementId={params.id} />
    </main>
  );
}
