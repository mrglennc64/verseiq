"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function CallbackContent() {
  const params = useSearchParams();
  const code = params.get("code");

  useEffect(() => {
    if (code) {
      fetch(`/api/spotify/callback?code=${code}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.access_token) {
            localStorage.setItem("spotify_access_token", data.access_token);
          }
          window.location.href = "/verseiq";
        })
        .catch(console.error);
    }
  }, [code]);

  return (
    <div style={{ padding: 40 }}>
      <h1>Connecting to Spotify…</h1>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}><h1>Connecting to Spotify…</h1></div>}>
      <CallbackContent />
    </Suspense>
  );
}