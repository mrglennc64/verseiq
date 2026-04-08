"use client";

export default function VerseIQPage() {
  return (
    <div className="page-shell">
      <div className="app-header">
        <div>
          <img src="/vlogo3.png" alt="VerseIQ logo" className="page-logo" />
          <h1 className="app-title">Get Paid What You&apos;re Owed</h1>
          <p className="app-subtle">
            VerseIQ is now built around an async Royalty Recovery engine. Start a scan,
            track progress live, and export evidence only when the analysis is complete.
          </p>
        </div>
      </div>

      <section className="panel-card" style={{ marginBottom: 20 }}>
        <h2>You&apos;re Getting Streams, But Not Getting Paid</h2>
        <p className="panel-copy">
          We scan artist catalogs in the background, normalize metadata, score royalty leakage,
          and surface the tracks most likely to be leaving money behind.
        </p>
        <div className="workflow-summary-grid" style={{ marginTop: 12 }}>
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">Step 1</div>
            <div className="workflow-summary-value">Start Scan</div>
            <div className="workflow-summary-copy">Queue a royalty scan for any artist URL or Spotify artist ID.</div>
          </div>
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">Step 2</div>
            <div className="workflow-summary-value">Track Progress</div>
            <div className="workflow-summary-copy">Watch status, progress, and scan messages update live.</div>
          </div>
          <div className="workflow-summary-card workflow-summary-card--warn">
            <div className="workflow-summary-label">Step 3</div>
            <div className="workflow-summary-value">Export Recovery Data</div>
            <div className="workflow-summary-copy">Download evidence CSV after the scan completes.</div>
          </div>
        </div>
      </section>

      <section className="panel-card" style={{ marginBottom: 20 }}>
        <h2>Async Royalty Recovery</h2>
        <p className="panel-copy" style={{ marginBottom: 12 }}>
          This is the primary workflow now. It is built for long-running artist scans and avoids timeout-prone synchronous exports.
        </p>
        <div className="button-row">
          <a href="/verseiq/royalty-recovery" style={{ textDecoration: "none" }}>
            <button type="button">Open Async Royalty Recovery</button>
          </a>
        </div>
      </section>

      <section className="panel-card" style={{ marginBottom: 20 }}>
        <h2>What The Scan Delivers</h2>
        <div className="workflow-summary-grid">
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">Confidence Score</div>
            <div className="workflow-summary-value">0-100</div>
            <div className="workflow-summary-copy">Weighted royalty leakage scoring from metadata, registration, playback, and age.</div>
          </div>
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">Estimated Value</div>
            <div className="workflow-summary-value">Range</div>
            <div className="workflow-summary-copy">Believable directional value estimate from track signal strength and catalog maturity.</div>
          </div>
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">Export</div>
            <div className="workflow-summary-value">CSV</div>
            <div className="workflow-summary-copy">Track-level output with flags, tiers, confidence, playback level, and age bucket.</div>
          </div>
        </div>
      </section>

      <section className="panel-card" style={{ marginBottom: 20 }}>
        <h2>Recovery Plans</h2>
        <div className="workflow-summary-grid">
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">Free</div>
            <div className="workflow-summary-value">$0</div>
            <div className="workflow-summary-copy">Run scans and review core results.</div>
          </div>
          <div className="workflow-summary-card">
            <div className="workflow-summary-label">Pro</div>
            <div className="workflow-summary-value">$39</div>
            <div className="workflow-summary-copy">Full report access plus export workflow.</div>
          </div>
          <div className="workflow-summary-card workflow-summary-card--warn">
            <div className="workflow-summary-label">Recovery</div>
            <div className="workflow-summary-value">10-20%</div>
            <div className="workflow-summary-copy">Hands-on recovery and metadata correction support.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
