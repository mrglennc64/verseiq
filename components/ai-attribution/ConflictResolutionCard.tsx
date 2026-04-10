import React from "react";

export function ConflictResolutionCard({ verseiq, cmo, onGenerate }: { verseiq: string; cmo: string; onGenerate?: () => void }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white flex flex-col md:flex-row gap-6">
      <div className="flex-1">
        <div className="text-sm font-semibold mb-2">VerseIQ Attribution</div>
        <div className="bg-gray-50 p-3 rounded mb-2">{verseiq}</div>
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold mb-2">CMO Registration</div>
        <div className="bg-gray-50 p-3 rounded mb-2">{cmo}</div>
      </div>
      <div className="flex flex-col justify-center items-center">
        <button className="bg-black text-white px-4 py-2 rounded font-medium text-xs" onClick={onGenerate}>
          Generate Correction Package
        </button>
      </div>
    </div>
  );
}
