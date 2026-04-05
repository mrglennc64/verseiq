import Link from "next/link";

export const metadata = {
  title: "VerseIQ — Intelligence layer for music rights data",
  description:
    "VerseIQ analyzes and improves the structure, consistency, and visibility of music rights data across territories. Built for the modern music industry.",
};

export default function HomePage() {
  return (
    <>
      <style>{`
        .bg-glow {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2;
          background: radial-gradient(circle at 30% 10%, #0b1420, #020408);
        }
        .bg-glow::before {
          content: ""; position: absolute; width: 100%; height: 100%;
          background: radial-gradient(ellipse at 70% 40%, rgba(29,185,84,0.08) 0%, rgba(0,0,0,0) 60%);
          pointer-events: none;
        }
        .container { max-width: 1280px; margin: 0 auto; padding: 0 2rem; }
        .navbar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 2rem 0 1rem 0; flex-wrap: wrap; gap: 1rem;
          border-bottom: 1px solid rgba(29,185,84,0.15);
        }
        .logo {
          font-size: 1.8rem; font-weight: 700; letter-spacing: -0.02em;
          background: linear-gradient(135deg,#FFFFFF 0%,#B3F0C5 80%);
          background-clip: text; -webkit-background-clip: text; color: transparent;
          text-decoration: none;
        }
        .nav-links { display: flex; gap: 2rem; }
        .nav-links a {
          color: #b9c8ff; text-decoration: none; font-size: 0.95rem;
          font-weight: 500; transition: color 0.2s;
        }
        .nav-links a:hover { color: #1DB954; }
        .badge-soon {
          background: rgba(29,185,84,0.12); border-radius: 100px; padding: 0.2rem 0.9rem;
          font-size: 0.75rem; font-weight: 500; color: #6fcf97;
          border: 0.5px solid rgba(29,185,84,0.3); display: inline-block;
        }
        .hero { padding: 5rem 0 4rem 0; text-align: center; animation: fadeUp 0.7s ease-out forwards; }
        .hero h1 {
          font-size: 4.2rem; font-weight: 700; letter-spacing: -0.03em; line-height: 1.2;
          background: linear-gradient(145deg,#FFFFFF 0%,#D0F0DF 100%);
          background-clip: text; -webkit-background-clip: text; color: transparent; margin-bottom: 1.5rem;
        }
        .hero-sub { font-size: 1.3rem; color: #b9ceff; max-width: 680px; margin: 0 auto 1.2rem auto; }
        .hero-desc {
          font-size: 1rem; color: #8ba0d0; max-width: 560px; margin: 0 auto;
          border-top: 1px solid rgba(29,185,84,0.2); padding-top: 1.8rem; display: inline-block;
        }
        .section { padding: 5rem 0; border-top: 1px solid rgba(29,185,84,0.08); animation: fadeUp 0.7s ease-out forwards; }
        .section-title {
          font-size: 2rem; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 2rem;
          color: #e2ecff; display: inline-block; border-left: 3px solid #1DB954; padding-left: 1rem;
        }
        .grid-2col { display: grid; grid-template-columns: repeat(2,1fr); gap: 2rem; }
        .feature-card {
          background: rgba(12,16,24,0.7); backdrop-filter: blur(2px); border-radius: 1.8rem;
          border: 1px solid rgba(29,185,84,0.2); padding: 2rem;
          transition: transform 0.2s ease, border-color 0.2s;
        }
        .feature-card:hover { border-color: rgba(29,185,84,0.5); transform: translateY(-3px); }
        .feature-icon { font-size: 2.2rem; margin-bottom: 1.2rem; display: inline-block; }
        .feature-card h3 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; color: #eef2ff; }
        .feature-card p { color: #b0c2e8; line-height: 1.5; }
        .status-card {
          background: linear-gradient(125deg,rgba(10,20,18,0.7) 0%,rgba(5,10,16,0.9) 100%);
          border-radius: 2rem; border: 1px solid rgba(29,185,84,0.25);
          padding: 2rem; margin-top: 1rem; text-align: center;
        }
        .status-badge {
          background: #1DB95420; padding: 0.3rem 1rem; border-radius: 40px; font-size: 0.8rem;
          font-weight: 500; color: #6fcf97; display: inline-block; margin-bottom: 1rem;
          border: 0.5px solid #1DB95440;
        }
        .status-card h3 { font-size: 1.8rem; margin-bottom: 1rem; }
        .status-card p { font-size: 1.05rem; max-width: 600px; margin: 0 auto; color: #c0d0f0; }
        .partner-note {
          background: rgba(29,185,84,0.04); border-radius: 1.2rem; padding: 1rem 1.5rem;
          text-align: center; font-size: 0.85rem; color: #7f9ad0; margin-top: 2rem;
          border: 0.5px dashed rgba(29,185,84,0.2);
        }
        .footer {
          border-top: 1px solid rgba(29,185,84,0.12); padding: 2.5rem 0 3rem 0; margin-top: 2rem;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem;
        }
        .footer-copyright { font-size: 0.85rem; color: #6c81ac; }
        .footer-domain {
          font-family: monospace; background: #0b0f18; padding: 0.3rem 0.9rem;
          border-radius: 40px; font-size: 0.8rem; color: #b0c6f0; letter-spacing: 0.3px;
        }
        .footer-links { display: flex; gap: 2rem; }
        .footer-links a { color: #9bb2e0; text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
        .footer-links a:hover { color: #1DB954; }
        @media (max-width: 860px) {
          .hero h1 { font-size: 2.8rem; }
          .hero-sub { font-size: 1.1rem; }
          .grid-2col { grid-template-columns: 1fr; gap: 1.5rem; }
          .navbar { flex-direction: column; align-items: flex-start; }
          .footer { flex-direction: column; text-align: center; }
        }
        @media (max-width: 480px) {
          .hero h1 { font-size: 2.2rem; }
          .feature-card { padding: 1.5rem; }
        }
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="bg-glow" />

      <div className="container">
        <div className="navbar">
          <Link href="/" className="logo">VerseIQ</Link>
          <div className="nav-links">
            <Link href="/verseiq">Dashboard</Link>
            <a href="#">Intelligence</a>
            <a href="#">Metadata</a>
            <a href="#">Insights</a>
            <a href="#" style={{ color: "#1DB954" }}>Contact</a>
          </div>
        </div>

        <div className="hero">
          <span className="badge-soon">Intelligence layer</span>
          <h1>VerseIQ</h1>
          <div className="hero-sub">VerseIQ is a royalty intelligence platform that maps and analyzes global music rights data, identifying gaps in metadata and territorial coverage.</div>
        </div>

        <div className="section">
          <div className="section-title">What it does</div>
          <div className="grid-2col">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Structured insights</h3>
              <p>Built on validated metadata, VerseIQ provides structured insights into ownership data, registrations, and potential inconsistencies across markets.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>Cross‑territory clarity</h3>
              <p>Identify missing rights, duplicate registrations, and conflicting claims. Empower rights holders with actionable data across 50+ territories.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Metadata validation</h3>
              <p>Automated checks for ISRC, ISWC, and work codes. Improve accuracy and reduce friction between publishers, PROs, and digital services.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚙️</div>
              <h3>Workflow integration</h3>
              <p>Designed for catalog managers, sync teams, and data operators. Seamless alignment with existing rights management stacks.</p>
            </div>
          </div>
          <div className="partner-note">
            ✦ Built on validated metadata — structured ownership &amp; registration intelligence ✦
          </div>
        </div>

        <div className="section">
          <div className="section-title">Current status</div>
          <div className="status-card">
            <div className="status-badge">● in active development</div>
            <h3>Currently in development.</h3>
            <p>Initial work focuses on metadata validation and data quality workflows in collaboration with industry partners.</p>
            <div style={{ marginTop: "1.8rem", fontSize: "0.85rem", color: "#7f9ad0", display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
              <span>✓ Data normalization engine</span>
              <span>✓ Rights conflict detection</span>
              <span>✓ Partner beta (Q4 2026)</span>
            </div>
          </div>
          <div className="partner-note" style={{ marginTop: "2rem", background: "rgba(29,185,84,0.02)" }}>
            🤝 Collaborating with independent labels, publishers, and collection societies to refine metadata standards.
          </div>
        </div>

        <div className="footer">
          <div className="footer-copyright">© VerseIQ</div>
          <div className="footer-domain">useverseiq.com</div>
          <div className="footer-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="#">Status</a>
          </div>
        </div>
      </div>
    </>
  );
}
