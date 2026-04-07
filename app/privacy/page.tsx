export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <section className="page-card legal-card">
      <span className="eyebrow">Policy</span>
      <h1>Privacy Policy</h1>
      <p>Last updated: April 2026</p>

      <h2>Who we are</h2>
      <p>
        VerseIQ is a music intelligence tool that analyzes publicly available Spotify metadata to help
        artists, labels, and rights holders identify international gaps, opportunities, and metadata
        inconsistencies.
      </p>

      <h2>Data we access</h2>
      <p>
        VerseIQ uses the Spotify Web API to access public metadata only, including artists, tracks,
        albums, playlists, genres, and popularity metrics. We do not access private listening history,
        private playlists, or user-specific streaming data.
      </p>

      <h2>How we use the data</h2>
      <p>
        We use metadata to generate analytics and insights such as territory gap analysis, rights
        registration patterns, and catalog performance indicators. We do not sell data or use it for
        advertising.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain data only as long as needed to provide the service or fulfill analytical requests.
        Cache and logs are rotated automatically.
      </p>

      <h2>Contact</h2>
      <p>
        Email: privacy@useverseiq.com
        <br />
        General inquiries: hello@useverseiq.com
      </p>
      </section>
    </main>
  );
}