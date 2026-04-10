import React from "react";

export function AuditModeCard({ missingAI, derivativeAmbiguity, cmoConflicts, onReview }: { missingAI: number; derivativeAmbiguity: number; cmoConflicts: number; onReview?: () => void }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white flex flex-col gap-2">
      <div className="text-sm font-semibold mb-2">Audit Mode</div>
      <div className="text-xs text-gray-500 mb-1">{missingAI} works missing AI declarations</div>
      <div className="text-xs text-gray-500 mb-1">{derivativeAmbiguity} works with derivative ambiguity</div>
      <div className="text-xs text-gray-500 mb-1">{cmoConflicts} works with CMO conflicts</div>
      <button className="mt-2 bg-black text-white px-4 py-2 rounded font-medium text-xs self-start" onClick={onReview}>
        Review All
      </button>
    </div>
  );
}
