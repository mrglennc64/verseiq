import React from "react";
import type { AIAttributionSummary } from "@/types/aiAttribution";

const badgeColors: Record<string, string> = {
  "AI-Generated": "bg-purple-100 text-purple-700",
  "AI-Assisted": "bg-blue-100 text-blue-700",
  "Human-Only": "bg-green-100 text-green-700",
  "Derivative": "bg-yellow-100 text-yellow-700",
  "Unknown": "bg-gray-100 text-gray-700",
};

const riskColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
  unknown: "bg-gray-100 text-gray-700",
};

export function HeroCard({ summary, onViewDetails }:{ summary: AIAttributionSummary; onViewDetails?: () => void }) {
  return (
    <div className="rounded-2xl shadow p-6 bg-white flex flex-col md:flex-row justify-between gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColors[summary.attributionType]}`}>{summary.attributionType}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${riskColors[summary.riskLevel]}`}>{summary.riskLevel.toUpperCase()} RISK</span>
        </div>
        <h2 className="text-xl font-semibold">AI Attribution Overview</h2>
        <div className="mt-2 text-gray-600 text-sm">This scan detected {summary.attributionType.toLowerCase()} content. Review provenance and risk below.</div>
        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-1">Provenance Completeness</div>
          <div className="w-full bg-gray-100 rounded h-3">
            <div className="bg-blue-600 h-3 rounded" style={{ width: `${summary.provenanceCompleteness}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-1">{summary.provenanceCompleteness}% complete</div>
        </div>
      </div>
      <div className="flex flex-col justify-center items-end gap-3 min-w-[200px]">
        <button
          className="bg-black text-white px-5 py-3 rounded font-medium shadow"
          onClick={onViewDetails}
        >
          View Attribution Details
        </button>
      </div>
    </div>
  );
}
