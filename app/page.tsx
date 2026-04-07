import Link from "next/link";

export const metadata = {
  title: "VerseIQ — Global Rights Intelligence",
  description:
    "VerseIQ analyzes music rights data across territories to identify gaps in metadata, registration, and market coverage.",
};

export default function HomePage() {
  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --bg-primary: #fcfefd;
          --bg-secondary: #f9fcfb;
          --bg-tertiary: #d8eee6;
          --bg-card: rgba(255, 255, 255, 0.74);
          --ink: #111413;
          --ink-soft: #57625f;
          --ink-muted: #74817d;
          --border: rgba(116, 188, 169, 0.18);
          --border-light: rgba(116, 188, 169, 0.14);
          --accent: #73bca8;
          --accent-soft: #b6ddd2;
          --accent-glow: rgba(114, 184, 167, 0.08);
          --ok: #4f8e72;
          --warn: #9c7d42;
          --err: #b55a66;
          --font-display: "Space Grotesk", sans-serif;
          --font-body: "Outfit", sans-serif;
          --font-mono: "JetBrains Mono", monospace;
        }

        html { scroll-behavior: smooth; }
        body {
          font-family: var(--font-body);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(255, 255, 255, 0.99) 64%, rgba(212, 239, 231, 0.92) 100%),
            radial-gradient(circle at 50% 100%, rgba(115, 188, 168, 0.18), transparent 38%);
          color: var(--ink);
          line-height: 1.6;
          overflow-x: hidden;
        }

        .grain-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 100%, rgba(143, 210, 194, 0.3), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0) 58%, rgba(203, 235, 226, 0.52) 100%);
          z-index: 0;
        }

        header {
          position: sticky;
          top: 0;
          z-index: 1000;
          padding: 18px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.72);
          border-bottom: 1px solid transparent;
          backdrop-filter: blur(4px);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .logo-icon { width: 46px; height: 46px; }
        .logo-icon rect {
          fill: transparent;
          stroke: transparent;
        }
        .logo-text {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: var(--ink);
        }

        .logo-accent { color: var(--accent); }

        nav {
          display: flex;
          align-items: center;
          gap: 28px;
        }

        nav a {
          font-size: 14px;
          font-weight: 500;
          color: var(--ink-soft);
          text-decoration: none;
          letter-spacing: 0.3px;
          transition: color 0.2s ease;
        }

        nav a:hover { color: var(--ink); }

        .nav-cta {
          border: 1px solid var(--accent);
          color: var(--accent);
          border-radius: 6px;
          padding: 8px 16px;
        }

        .nav-cta:hover {
          color: #fff;
          background: var(--accent);
        }

        .hero {
          min-height: calc(100vh - 78px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 40px 48px;
          position: relative;
          z-index: 1;
        }

        .hero-content {
          max-width: 1320px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          gap: 48px;
          grid-template-columns: 1.3fr 1fr;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--accent);
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .hero h1 {
          font-family: var(--font-display);
          font-size: clamp(42px, 6vw, 76px);
          font-weight: 700;
          line-height: 1.08;
          margin-bottom: 20px;
        }

        .hero h1 .accent { color: var(--accent); }
        .hero-tagline {
          font-size: 20px;
          color: var(--ink-soft);
          max-width: 670px;
          margin-bottom: 34px;
          line-height: 1.6;
        }

        .hero-stats {
          display: flex;
          gap: 36px;
          flex-wrap: wrap;
        }

        .hero-stat-number {
          font-family: var(--font-display);
          font-size: 36px;
          font-weight: 700;
          color: var(--accent);
          line-height: 1;
          margin-bottom: 6px;
        }

        .hero-stat-label {
          font-size: 12px;
          color: var(--ink-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .scanner-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 12px 28px rgba(77, 145, 130, 0.08);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(8px);
        }

        .scanner-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(115, 188, 168, 0.32);
        }

        .scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-light);
        }

        .scanner-title {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--ink-muted);
          letter-spacing: 1px;
        }

        .scanner-status {
          display: flex;
          gap: 8px;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--accent);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
        }

        .scanner-work-title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 14px;
        }

        .scanner-territories {
          display: grid;
          gap: 10px;
          margin-bottom: 16px;
        }

        .territory {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 11px 13px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(116, 188, 169, 0.12);
        }

        .territory-name { font-size: 13px; font-weight: 500; }
        .territory-status {
          font-family: var(--font-mono);
          font-size: 10px;
          padding: 4px 9px;
          border-radius: 12px;
        }

        .territory.complete { border-left: 3px solid var(--ok); }
        .territory.complete .territory-status { background: rgba(79, 127, 82, 0.12); color: var(--ok); }
        .territory.warning { border-left: 3px solid var(--warn); }
        .territory.warning .territory-status { background: rgba(159, 106, 47, 0.12); color: var(--warn); }
        .territory.error { border-left: 3px solid var(--err); }
        .territory.error .territory-status { background: rgba(154, 61, 51, 0.12); color: var(--err); }

        .scanner-insight {
          padding: 14px;
          border: 1px solid rgba(116, 188, 169, 0.16);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.72);
        }

        .scanner-insight-label {
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 6px;
        }

        .scanner-insight-text { font-size: 12px; color: var(--ink-soft); line-height: 1.5; }

        section { padding: 104px 40px; position: relative; z-index: 1; }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 56px; }

        .section-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--accent);
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 14px;
          display: block;
        }

        .section-title {
          font-family: var(--font-display);
          font-size: clamp(30px, 4vw, 46px);
          font-weight: 700;
          margin-bottom: 14px;
        }

        .section-underline {
          width: 48px;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-soft));
          margin: 18px auto;
          border-radius: 2px;
        }

        .section-subtitle {
          font-size: 17px;
          color: var(--ink-soft);
          max-width: 700px;
          margin: 0 auto;
        }

        .features,
        .audience {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0.08));
        }

        .features-grid,
        .audience-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 22px;
        }

        .feature-card,
        .audience-card {
          padding: 32px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 18px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          box-shadow: 0 10px 24px rgba(77, 145, 130, 0.06);
          backdrop-filter: blur(6px);
        }

        .feature-card:hover,
        .audience-card:hover {
          transform: translateY(-4px);
          border-color: #9cd5c7;
          box-shadow: 0 16px 30px rgba(77, 145, 130, 0.12);
        }

        .feature-icon,
        .audience-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          color: var(--accent);
        }

        .feature-card h3,
        .audience-card h4 {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .feature-card p,
        .audience-card p {
          font-size: 14px;
          color: var(--ink-muted);
          line-height: 1.7;
        }

        .process-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 28px;
        }

        .process-step { text-align: center; }
        .step-number {
          width: 70px;
          height: 70px;
          margin: 0 auto 18px;
          border-radius: 50%;
          border: 2px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 700;
          color: var(--accent);
          background: var(--bg-card);
        }

        .process-step h4 {
          font-family: var(--font-display);
          font-size: 18px;
          margin-bottom: 8px;
        }

        .process-step p { font-size: 13px; color: var(--ink-muted); }

        .status-section { text-align: center; }
        .status-badge {
          display: inline-flex;
          gap: 10px;
          align-items: center;
          padding: 14px 24px;
          border-radius: 28px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          margin-bottom: 26px;
        }

        .status-text { font-size: 14px; font-weight: 500; }
        .status-description {
          font-size: 17px;
          color: var(--ink-soft);
          max-width: 640px;
          margin: 0 auto;
          line-height: 1.75;
        }

        .ecosystem-link {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(230, 245, 239, 0.72));
          border: 1px solid var(--border);
          border-radius: 20px;
          text-align: center;
          padding: 46px;
        }

        .ecosystem-link h3 {
          font-family: var(--font-display);
          font-size: 26px;
          margin-bottom: 10px;
        }

        .ecosystem-link p {
          font-size: 14px;
          color: var(--ink-muted);
          margin-bottom: 20px;
        }

        .ecosystem-link a {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }

        footer {
          background: transparent;
          border-top: 1px solid rgba(116, 188, 169, 0.08);
          padding: 42px 40px;
          position: relative;
          z-index: 1;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 22px;
        }

        .footer-brand { display: flex; align-items: center; gap: 10px; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a {
          text-decoration: none;
          color: var(--ink-muted);
          font-size: 13px;
        }

        .footer-copyright,
        .footer-ecosystem {
          font-size: 12px;
          color: var(--ink-muted);
        }

        .footer-ecosystem span { color: var(--accent); }

        @media (max-width: 1100px) {
          .hero-content { grid-template-columns: 1fr; }
        }

        @media (max-width: 980px) {
          .features-grid,
          .audience-grid,
          .process-steps { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 760px) {
          header { padding: 16px 20px; }
          nav { display: none; }
          .hero { padding: 72px 20px 28px; }
          section { padding: 72px 20px; }
          .features-grid,
          .audience-grid,
          .process-steps { grid-template-columns: 1fr; }
          .hero-stats { flex-direction: column; gap: 20px; }
        }
      `}</style>

      <div className="grain-bg" />

      <header>
        <Link href="/" className="logo" aria-label="VerseIQ home">
          <svg className="logo-icon" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="10" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="20" cy="20" r="4" fill="var(--accent)" />
          </svg>
          <span className="logo-text">
            VERSE<span className="logo-accent">IQ</span>
          </span>
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#process">How It Works</a>
          <a href="#audience">For Whom</a>
          <Link href="/verseiq">Dashboard</Link>
          <a href="https://perfecthold.online" className="nav-cta" target="_blank" rel="noreferrer">
            Perfect Hold
          </a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div>
            <div className="hero-badge">Global Rights Intelligence</div>
            <h1>
              Intelligence for <span className="accent">Global Music Rights</span>
            </h1>
            <p className="hero-tagline">
              VerseIQ analyzes music rights data across territories to identify gaps in metadata, registration, and market
              coverage before they cost you royalties.
            </p>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-number">200+</div>
                <div className="hero-stat-label">Territories</div>
              </div>
              <div>
                <div className="hero-stat-number">&lt;24h</div>
                <div className="hero-stat-label">Gap Detection</div>
              </div>
              <div>
                <div className="hero-stat-number">100%</div>
                <div className="hero-stat-label">Coverage Analysis</div>
              </div>
            </div>
          </div>

          <div className="scanner-card">
            <div className="scanner-header">
              <span className="scanner-title">CATALOG ANALYSIS</span>
              <div className="scanner-status">
                <div className="status-dot" />
                Scanning
              </div>
            </div>
            <div className="scanner-work-title">Midnight Echo</div>
            <div className="scanner-territories">
              <div className="territory complete">
                <span className="territory-name">Sweden</span>
                <span className="territory-status">Registered</span>
              </div>
              <div className="territory warning">
                <span className="territory-name">United Kingdom</span>
                <span className="territory-status">Not Verified</span>
              </div>
              <div className="territory error">
                <span className="territory-name">United States</span>
                <span className="territory-status">No Registration</span>
              </div>
              <div className="territory warning">
                <span className="territory-name">Germany</span>
                <span className="territory-status">Not Verified</span>
              </div>
            </div>
            <div className="scanner-insight">
              <div className="scanner-insight-label">Insight Detected</div>
              <div className="scanner-insight-text">
                Incomplete territorial coverage detected. This work may not be fully represented across key markets.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">Capabilities</span>
            <h2 className="section-title">Identify Gaps Before They Become Problems</h2>
            <div className="section-underline" />
            <p className="section-subtitle">
              VerseIQ highlights inconsistencies in catalog data across markets, ensuring complete and accurate music rights
              representation globally.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Metadata Analysis</h3>
              <p>Scans for missing registrations, incomplete metadata fields, and inconsistent data across international databases and PROs.</p>
            </div>
            <div className="feature-card">
              <h3>Territorial Coverage</h3>
              <p>Maps your catalog against key markets to identify where works are registered, incomplete, or entirely absent.</p>
            </div>
            <div className="feature-card">
              <h3>Conflict Detection</h3>
              <p>Identifies duplicate registrations, conflicting ownership claims, and orphaned works across global databases.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="process">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">Process</span>
            <h2 className="section-title">How It Works</h2>
            <div className="section-underline" />
            <p className="section-subtitle">Built on validated metadata workflows for accurate, actionable intelligence.</p>
          </div>

          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <h4>Validate</h4>
              <p>Validated metadata is used as the foundation for all analysis.</p>
            </div>
            <div className="process-step">
              <div className="step-number">2</div>
              <h4>Analyze</h4>
              <p>Works are analyzed across territories and databases.</p>
            </div>
            <div className="process-step">
              <div className="step-number">3</div>
              <h4>Identify</h4>
              <p>Gaps and inconsistencies are identified with precision.</p>
            </div>
            <div className="process-step">
              <div className="step-number">4</div>
              <h4>Report</h4>
              <p>Results are presented in a clear, structured format.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="audience" className="audience">
        <div className="section-container">
          <div className="section-header">
            <span className="section-label">Market</span>
            <h2 className="section-title">Designed For</h2>
            <div className="section-underline" />
          </div>
          <div className="audience-grid">
            <div className="audience-card">
              <h4>Music Publishers</h4>
              <p>Ensure complete territorial coverage and prevent royalty leakage across your entire catalog.</p>
            </div>
            <div className="audience-card">
              <h4>Rights Administrators</h4>
              <p>Identify registration gaps and metadata issues before they impact royalty distributions.</p>
            </div>
            <div className="audience-card">
              <h4>Catalog Managers</h4>
              <p>Gain complete visibility into your catalog global representation and data quality.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="status-section">
        <div className="section-container">
          <div className="status-badge">
            <div className="status-dot" />
            <span className="status-text">Currently in Development</span>
          </div>
          <h2 className="section-title" style={{ marginBottom: "24px" }}>Clarity Before Scale</h2>
          <p className="status-description">
            Initial work focuses on metadata validation and data quality workflows in collaboration with industry partners.
            VerseIQ is being built to high standards of accuracy and reliability.
          </p>
        </div>
      </section>

      <section>
        <div className="section-container">
          <div className="ecosystem-link">
            <h3>Part of the Perfect Hold Ecosystem</h3>
            <p>
              VerseIQ is a subsidiary of Perfect Hold, operating alongside SMPT, Roya, TrapRoyalties PRO, and TrapRoyalties
              to deliver comprehensive music rights intelligence.
            </p>
            <a href="https://perfecthold.online" target="_blank" rel="noreferrer">Visit Perfect Hold</a>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-container">
          <div className="footer-brand">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <rect x="2" y="2" width="36" height="36" rx="8" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2" />
              <circle cx="20" cy="20" r="10" stroke="var(--accent)" strokeWidth="2" />
              <circle cx="20" cy="20" r="4" fill="var(--accent)" />
            </svg>
            <span className="logo-text">
              VERSE<span className="logo-accent">IQ</span>
            </span>
          </div>
          <div className="footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
          <div className="footer-copyright">© 2026 VerseIQ. All rights reserved.</div>
          <div className="footer-ecosystem">
            <span>PERFECT HOLD</span> ECOSYSTEM
          </div>
        </div>
      </footer>
    </>
  );
}
