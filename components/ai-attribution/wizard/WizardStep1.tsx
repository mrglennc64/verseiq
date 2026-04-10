import React from "react";

export function WizardStep1({ onNext }: { onNext: (usedAI: boolean) => void }) {
  return (
    <div className="rounded-2xl shadow p-6 bg-white flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Was AI used in this work?</h2>
      <div className="flex gap-4">
        <button className="bg-black text-white px-5 py-3 rounded font-medium" onClick={() => onNext(true)}>
          Yes, AI was used
        </button>
        <button className="bg-gray-200 text-black px-5 py-3 rounded font-medium" onClick={() => onNext(false)}>
          No, human-only
        </button>
      </div>
    </div>
  );
}
