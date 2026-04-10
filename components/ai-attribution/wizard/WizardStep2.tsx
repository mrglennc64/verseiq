import React, { useState } from "react";

const models = ["ChatGPT", "Stable Diffusion", "Other"];

export function WizardStep2({ onNext }: { onNext: (models: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="rounded-2xl shadow p-6 bg-white flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Which model(s) were used?</h2>
      <div className="flex gap-2 flex-wrap">
        {models.map(m => (
          <button
            key={m}
            className={`px-4 py-2 rounded border ${selected.includes(m) ? "bg-blue-600 text-white" : "bg-gray-100 text-black"}`}
            onClick={() => setSelected(sel => sel.includes(m) ? sel.filter(x => x !== m) : [...sel, m])}
          >
            {m}
          </button>
        ))}
      </div>
      <button className="bg-black text-white px-5 py-3 rounded font-medium self-end" onClick={() => onNext(selected)}>
        Next
      </button>
    </div>
  );
}
