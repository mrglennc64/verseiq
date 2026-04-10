import React from "react";
import type { RegistrationAlignment } from "@/types/aiAttribution";

export function RegistrationAlignmentCard({ alignment, onGenerate }: { alignment: RegistrationAlignment; onGenerate?: () => void }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white flex flex-col gap-2">
      <div className="text-sm font-semibold mb-1">Registration Alignment</div>
      <div className="text-xs text-gray-500 mb-1">CMO Support: <span className={alignment.cmoSupport ? "text-green-600" : "text-red-600"}>{alignment.cmoSupport ? "Yes" : "No"}</span></div>
      <div className="text-xs text-gray-500 mb-1">Conflicts: {alignment.conflicts.length ? alignment.conflicts.join(", ") : "None"}</div>
      <div className="text-xs text-gray-500 mb-1">Required Corrections: {alignment.requiredCorrections.length ? alignment.requiredCorrections.join(", ") : "None"}</div>
      <button
        className="mt-2 bg-black text-white px-4 py-2 rounded font-medium text-xs self-start"
        onClick={onGenerate}
      >
        Generate CMO-Ready Update Package
      </button>
    </div>
  );
}
