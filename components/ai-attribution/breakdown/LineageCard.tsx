import React from "react";
import type { DerivativeLineage } from "@/types/aiAttribution";

export function LineageCard({ lineage }: { lineage: DerivativeLineage }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white flex flex-col gap-2">
      <div className="text-sm font-semibold mb-1">Derivative Lineage</div>
      <div className="text-xs text-gray-500 mb-1">Source Works: {lineage.sourceWorks.join(", ") || "None"}</div>
      <div className="text-xs text-gray-500 mb-1">Similarity: {lineage.similarityIndicators.join(", ") || "None"}</div>
      <div className="text-xs text-gray-500 mb-1">Relationships: {lineage.derivativeRelationships.join(", ") || "None"}</div>
      <div className="text-xs text-gray-500 mb-1">Jurisdiction: {lineage.jurisdictionRelevance.join(", ") || "None"}</div>
    </div>
  );
}
