import React from "react";
import type { ProvenanceEvent } from "@/types/aiAttribution";

export function ProvenanceTimelineCard({ events }: { events: ProvenanceEvent[] }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white">
      <div className="text-sm font-semibold mb-3">Provenance Timeline</div>
      <div className="border-l-2 border-gray-200 pl-4">
        {events.map((e, i) => (
          <div key={i} className="mb-4 relative">
            <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
            <div className="text-xs text-gray-500">{e.timestamp}</div>
            <div className="font-medium text-sm">{e.event}</div>
            {e.details && <div className="text-xs text-gray-600">{e.details}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
