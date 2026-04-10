import React from "react";
import type { RiskAssessment } from "@/types/aiAttribution";

const riskColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
  unknown: "bg-gray-100 text-gray-700",
};

export function RiskCard({ risk }: { risk: RiskAssessment }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${riskColors[risk.riskLevel]}`}>{risk.riskLevel.toUpperCase()} RISK</span>
        <span className="text-sm font-semibold">Risk & Recommendations</span>
      </div>
      <div className="text-xs text-gray-500 mb-2">Missing Metadata: {risk.missingMetadata.join(", ") || "None"}</div>
      <div className="text-xs text-gray-500 mb-2">Jurisdiction Requirements: {risk.jurisdictionRequirements.join(", ") || "None"}</div>
      <div className="text-xs text-gray-500 mb-2">Recommendations:</div>
      <ul className="list-disc pl-5 text-xs text-gray-700">
        {risk.recommendations.map((rec, i) => (
          <li key={i}>{rec}</li>
        ))}
      </ul>
    </div>
  );
}
