import React from "react";
import type { AttributionMatrix } from "@/types/aiAttribution";

export function AttributionMatrixCard({ matrix }: { matrix: AttributionMatrix }) {
  const rows = [
    { label: "Human", data: matrix.human },
    { label: "AI", data: matrix.ai },
    { label: "Hybrid", data: matrix.hybrid },
  ];
  const cols = ["Composer", "Lyricist", "Producer"];
  return (
    <div className="rounded-2xl shadow p-5 bg-white">
      <div className="text-sm font-semibold mb-3">Attribution Matrix</div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div></div>
        {cols.map(col => (
          <div key={col} className="font-semibold text-gray-700">{col}</div>
        ))}
        {rows.map((row, i) => (
          <React.Fragment key={row.label}>
            <div className="font-semibold text-gray-700 py-2">{row.label}</div>
            {row.data.map((cell, j) => (
              <div key={j} className="border rounded p-2 bg-gray-50 flex flex-col gap-1">
                <span className="font-medium">{cell.nameOrModel}</span>
                <span>Contribution: {cell.contributionPercent}%</span>
                <span>Confidence: {cell.confidence}%</span>
                <span className="text-gray-500">{cell.source}</span>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
