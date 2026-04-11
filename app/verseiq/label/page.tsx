// Label Dashboard — shell UI.
//
// There is no Label model in the DB yet, so this page renders entirely
// placeholder data. When the Label/roster model lands, replace the DEMO_*
// constants below with a fetch to /api/label/dashboard and wire the same
// shape through. Every placeholder section is marked with a "soon" tag so
// it's obvious which fields still need a real source.

"use client";

import styles from "./page.module.css";

const DEMO_LABEL = {
  name: "Label Name",
  artistCount: 12,
  recordingCount: 327,
  workCount: 241,
  catalogHealth: 88,
  pendingRegistrations: 14,
  recoveryOpportunities: 6,
};

const DEMO_ARTISTS = [
  { name: "Artist A", tracks: 42, health: 92, issues: "1 warning", healthTone: "ok" as const },
  { name: "Artist B", tracks: 18, health: 74, issues: "4 warnings", healthTone: "warn" as const },
  { name: "Artist C", tracks: 63, health: 89, issues: "—", healthTone: "ok" as const },
];

const DEMO_ACTIVITY = [
  "Registered 27 recordings with SoundExchange",
  "Submitted 3 LOD packets",
  "6 recordings missing ISRCs",
];

export default function LabelDashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.dashboard}>
        {/* LEFT — label summary */}
        <div className={styles.card}>
          <div className={styles.labelHeader}>
            <div className={styles.labelAvatar}>LBL</div>
            <div>
              <div className={styles.labelName}>{DEMO_LABEL.name}</div>
              <div className={styles.labelSub}>
                Managing {DEMO_LABEL.artistCount} Artists · {DEMO_LABEL.recordingCount} Recordings
              </div>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div>
              <div className={styles.statLabel}>
                Catalog Health <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={styles.statScore}>
                {DEMO_LABEL.catalogHealth} <span>/ 100</span>
              </div>
            </div>
            <div>
              <div className={styles.statLabel}>
                Pending Registrations <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={styles.statValue}>{DEMO_LABEL.pendingRegistrations}</div>
            </div>
            <div>
              <div className={styles.statLabel}>
                Recovery Opportunities <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={`${styles.statValue} ${styles.warn}`}>
                {DEMO_LABEL.recoveryOpportunities}
              </div>
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Artists</div>
              <div className={styles.metricValue}>{DEMO_LABEL.artistCount}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Recordings</div>
              <div className={styles.metricValue}>{DEMO_LABEL.recordingCount}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>
                Works <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={styles.metricValue}>{DEMO_LABEL.workCount}</div>
            </div>
          </div>
        </div>

        {/* RIGHT — artists overview + activity */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Artists Overview <span className={styles.placeholderTag}>soon</span>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Artist</th>
                <th>Catalog</th>
                <th>Health</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ARTISTS.map((a) => (
                <tr key={a.name}>
                  <td>{a.name}</td>
                  <td>{a.tracks} tracks</td>
                  <td className={a.healthTone === "ok" ? styles.ok : styles.warn}>
                    {a.health}
                  </td>
                  <td>{a.issues}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.cardTitle} style={{ marginTop: 20 }}>
            Recent Label Activity <span className={styles.placeholderTag}>soon</span>
          </div>
          <ul className={styles.list}>
            {DEMO_ACTIVITY.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
