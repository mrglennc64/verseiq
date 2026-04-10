import React, { useState } from "react";

export function WizardStep3({ onNext }: { onNext: (sources: string[]) => void }) {
  const [sources, setSources] = useState<string[]>([]);
  const [input, setInput] = useState("");
  return (
    <div className="rounded-2xl shadow p-6 bg-white flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Any source works involved?</h2>
      <div className="flex gap-2 flex-wrap">
        {sources.map((s, i) => (
          <span key={i} className="bg-gray-200 px-3 py-1 rounded-full text-xs">{s}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="border px-3 py-2 rounded flex-1"
          placeholder="Add source work..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={() => {
            if (input.trim()) {
              setSources([...sources, input.trim()]);
              setInput("");
            }
          }}
        >
          Add
        </button>
      </div>
      <button className="bg-black text-white px-5 py-3 rounded font-medium self-end" onClick={() => onNext(sources)}>
        Next
      </button>
    </div>
  );
}
