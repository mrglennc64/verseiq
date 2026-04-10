"use client";

import { useRef, useState } from "react";

type UploadResult = {
  statement: {
    id: string;
    sourcePlatform: string;
    sourceFilename: string;
    totalRows: number;
    matchedRows: number;
    unmatchedRows: number;
    totalAmount: number;
    unmatchedAmount: number;
  };
  headerMap: Record<string, string | undefined>;
  warnings: string[];
};

const PLATFORMS = [
  { value: "generic", label: "Generic / Other" },
  { value: "soundexchange", label: "SoundExchange" },
  { value: "mlc", label: "MLC" },
  { value: "distrokid", label: "DistroKid" },
  { value: "cdbaby", label: "CD Baby" },
  { value: "tunecore", label: "TuneCore" },
  { value: "ascap", label: "ASCAP" },
  { value: "bmi", label: "BMI" },
  { value: "sesac", label: "SESAC" },
];

type Props = {
  onUploaded: (statementId: string) => void;
};

export function StatementUploadForm({ onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [sourcePlatform, setSourcePlatform] = useState("generic");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Pick a CSV file first");
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sourcePlatform", sourcePlatform);
      if (notes) form.append("notes", notes);

      const res = await fetch("/api/statements", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      setResult(data);
      setFile(null);
      setNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded(data.statement.id);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="catalog-panel">
      <header className="catalog-panel__header">
        <h2 className="catalog-panel__title">Upload statement</h2>
      </header>

      <form className="catalog-form" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          className="catalog-form__input"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <select
          className="catalog-form__input"
          value={sourcePlatform}
          onChange={(e) => setSourcePlatform(e.target.value)}
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          className="catalog-form__input"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="submit" className="catalog-form__submit" disabled={submitting || !file}>
          {submitting ? "Uploading…" : "Upload & match"}
        </button>
      </form>

      {error && <div className="catalog-panel__error">{error}</div>}

      {result && (
        <div className="statement-upload-result">
          <div className="statement-upload-result__title">
            Ingested {result.statement.sourceFilename}
          </div>
          <div className="statement-upload-result__meta">
            {result.statement.matchedRows} matched · {result.statement.unmatchedRows} unmatched ·{" "}
            ${result.statement.totalAmount.toFixed(2)} total
          </div>
          {result.warnings.length > 0 && (
            <ul className="statement-upload-result__warnings">
              {result.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
          <div className="statement-upload-result__headers">
            Detected columns:{" "}
            {Object.entries(result.headerMap)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}→"${v}"`)
              .join(", ") || "none"}
          </div>
        </div>
      )}
    </section>
  );
}
