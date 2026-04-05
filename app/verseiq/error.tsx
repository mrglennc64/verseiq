"use client";

import { useEffect } from "react";

export default function VerseIQError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VerseIQ route error:", error);
  }, [error]);

  return (
    <div style={{ padding: 40 }}>
      <h1>VerseIQ</h1>
      <p>Something went wrong while loading this page.</p>
      <p style={{ color: "#ffb4b4", maxWidth: 720 }}>
        {error?.message || "Unknown runtime error"}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 6,
          border: "1px solid #1DB954",
          background: "#0b1320",
          color: "#e8f0ff",
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}
