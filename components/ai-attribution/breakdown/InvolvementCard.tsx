import React from "react";
import type { AIInvolvement } from "@/types/aiAttribution";

export function InvolvementCard({ involvement }: { involvement: AIInvolvement }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white flex flex-col gap-2">
      <div className="text-sm font-semibold mb-1">AI Involvement</div>
      <div className="text-xs text-gray-500 mb-2">Detected Models: {involvement.detectedModels.join(", ") || "None"}</div>
      <div className="flex gap-2 text-xs">
        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Human: {involvement.humanContribution}%</span>
        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">AI: {involvement.aiContribution}%</span>
        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">Confidence: {involvement.confidenceScore}%</span>
      </div>
      {involvement.missingDeclarations.length > 0 && (
        <div className="mt-2 text-xs text-red-600">Missing: {involvement.missingDeclarations.join(", ")}</div>
      )}
    </div>
  );
}
