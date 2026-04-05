"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function CallbackContent() {
  const params = useSearchParams();
  const code = params.get("code");
  const [statusMessage, setStatusMessage] = useState("Connecting to Spotify...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setErrorMessage("Missing Spotify authorization code. Please reconnect.");
      return;
    }

    async function exchangeCode() {
      try {
        const res = await fetch(`/api/spotify/callback?code=${encodeURIComponent(code)}`);
        const data = await res.json();

        if (!res.ok || !data.access_token) {
          const reason = data?.details || data?.error || "Token exchange failed";
          setErrorMessage(`Spotify login failed: ${reason}`);
          return;
        }

        localStorage.setItem("spotify_access_token", data.access_token);
        if (data.expires_in) {
          const expiresAt = Date.now() + Number(data.expires_in) * 1000;
          localStorage.setItem("spotify_access_token_expires_at", String(expiresAt));
        }
        if (data.refresh_token) {
          localStorage.setItem("spotify_refresh_token", data.refresh_token);
        }

        setStatusMessage("Connected. Redirecting to dashboard...");
        window.location.href = "/verseiq";
      } catch (error) {
        console.error(error);
        setErrorMessage("Network error while connecting to Spotify. Please try again.");
      }
    }

    exchangeCode();
  }, [code]);

  return (
    <div style={{ padding: 40 }}>
      <h1>{statusMessage}</h1>
      {errorMessage ? (
        <>
          <p style={{ color: "#ff6b6b", maxWidth: 700 }}>{errorMessage}</p>
          <a
            href="/verseiq"
            style={{ color: "#9ad0ff", textDecoration: "underline", display: "inline-block", marginTop: 8 }}
          >
            Return to dashboard
          </a>
        </>
      ) : null}
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