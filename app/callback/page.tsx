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

        setStatusMessage("Connected. Redirecting to workflow...");
        window.location.href = "/verseiq";
      } catch (error) {
        console.error(error);
        setErrorMessage("Network error while connecting to Spotify. Please try again.");
      }
    }

    exchangeCode();
  }, [code]);

  return (
    <div className="page-shell">
      <section className="page-card legal-card">
      <span className="eyebrow">Spotify</span>
      <h1>{statusMessage}</h1>
      {errorMessage ? (
        <>
          <p className="notice-error" style={{ maxWidth: 700 }}>{errorMessage}</p>
          <a
            href="/verseiq"
            className="link-text"
            style={{ display: "inline-block", marginTop: 8 }}
          >
            Return to workflow
          </a>
        </>
      ) : null}
      </section>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="page-shell"><section className="page-card legal-card"><h1>Connecting to Spotify...</h1></section></div>}>
      <CallbackContent />
    </Suspense>
  );
}