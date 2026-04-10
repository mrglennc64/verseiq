import React from "react";

export function WizardStep4({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="rounded-2xl shadow p-6 bg-white flex flex-col gap-4 items-center">
      <h2 className="text-lg font-semibold">Confirm & Save</h2>
      <p className="text-gray-600">Review your attribution details and save to complete the process.</p>
      <button className="bg-black text-white px-5 py-3 rounded font-medium" onClick={onConfirm}>
        Confirm & Save
      </button>
    </div>
  );
}
