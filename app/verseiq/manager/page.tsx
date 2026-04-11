// Manager Dashboard — shell UI.
//
// No Manager model in the DB yet; everything is placeholder. When a real
// roster model lands, replace DEMO_* with a fetch and keep the same shape.

"use client";

import styles from "./page.module.css";

const DEMO_MANAGER = {
  name: "Manager Name",
  artistCount: 7,
  recordingCount: 142,
  openTasks: 9,
};

const DEMO_ARTISTS = [
  { name: "Artist A", health: 92, issues: 1, tone: "ok" as const },
  { name: "Artist B", health: 74, issues: 4, tone: "warn" as const },
  { name: "Artist C", health: 88, issues: 0, tone: "ok" as const },
];

const DEMO_TASKS = [
  "Confirm splits for Artist A",
  "Upload missing ISRCs for Artist B",
  "Verify PRO registration for Artist C",
];

const DEMO_ACTIVITY = [
  "Submitted 3 LOD packets",
  "Registered 12 works with MLC",
  "4 recordings missing metadata",
];

export default function ManagerDashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.dashboard}>
        {/* LEFT — manager summary + artist health */}
        <div className={styles.card}>
          <div className={styles.managerHeader}>
            <div className={styles.managerAvatar}>MGR</div>
            <div>
              <div className={styles.managerName}>{DEMO_MANAGER.name}</div>
              <div className={styles.managerSub}>
                Managing {DEMO_MANAGER.artistCount} Artists
              </div>
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Artists</div>
              <div className={styles.metricValue}>{DEMO_MANAGER.artistCount}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Total Recordings</div>
              <div className={styles.metricValue}>{DEMO_MANAGER.recordingCount}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>
                Open Tasks <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={`${styles.metricValue} ${styles.warn}`}>
                {DEMO_MANAGER.openTasks}
              </div>
            </div>
          </div>

          <div className={styles.cardTitle} style={{ marginTop: 20 }}>
            Artist Health Overview <span className={styles.placeholderTag}>soon</span>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Artist</th>
                <th>Health</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ARTISTS.map((a) => (
                <tr key={a.name}>
                  <td>{a.name}</td>
                  <td className={a.tone === "ok" ? styles.ok : styles.warn}>{a.health}</td>
                  <td>{a.issues}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT — tasks + activity */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Tasks Across All Artists <span className={styles.placeholderTag}>soon</span>
          </div>
          <ul className={styles.list}>
            {DEMO_TASKS.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>

          <div className={styles.cardTitle} style={{ marginTop: 20 }}>
            Recent Manager Activity <span className={styles.placeholderTag}>soon</span>
          </div>
          <ul className={styles.list}>
            {DEMO_ACTIVITY.map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
