// Publisher Dashboard — shell UI.
//
// No Publisher/Writer/Work model in the DB yet; everything is placeholder.
// When the publishing side of the data model lands (Works, Writers, CMO
// registrations), replace DEMO_* with a fetch and keep the same shape.

"use client";

import styles from "./page.module.css";

const DEMO_PUBLISHER = {
  name: "Publisher Name",
  writerCount: 42,
  workCount: 612,
  catalogHealth: 91,
  unregisteredWorks: 12,
  pendingClaims: 7,
  cmoConflicts: 3,
};

const DEMO_WRITERS = [
  { name: "Writer A", works: 34, registered: "100%", issues: "—", tone: "ok" as const },
  { name: "Writer B", works: 18, registered: "78%", issues: "3", tone: "warn" as const },
  { name: "Writer C", works: 51, registered: "96%", issues: "1", tone: "ok" as const },
];

const DEMO_ACTIVITY = [
  "Registered 42 works with ASCAP",
  "Submitted 12 MLC claims",
  "3 works missing ISWC",
];

export default function PublisherDashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.dashboard}>
        {/* LEFT — publisher summary */}
        <div className={styles.card}>
          <div className={styles.publisherHeader}>
            <div className={styles.publisherAvatar}>PUB</div>
            <div>
              <div className={styles.publisherName}>{DEMO_PUBLISHER.name}</div>
              <div className={styles.publisherSub}>
                Managing {DEMO_PUBLISHER.writerCount} Writers · {DEMO_PUBLISHER.workCount} Works
              </div>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div>
              <div className={styles.statLabel}>
                Catalog Health <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={styles.statScore}>
                {DEMO_PUBLISHER.catalogHealth} <span>/ 100</span>
              </div>
            </div>
            <div>
              <div className={styles.statLabel}>
                Unregistered Works <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={`${styles.statValue} ${styles.warn}`}>
                {DEMO_PUBLISHER.unregisteredWorks}
              </div>
            </div>
            <div>
              <div className={styles.statLabel}>
                Pending Claims <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={styles.statValue}>{DEMO_PUBLISHER.pendingClaims}</div>
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Writers</div>
              <div className={styles.metricValue}>{DEMO_PUBLISHER.writerCount}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Works</div>
              <div className={styles.metricValue}>{DEMO_PUBLISHER.workCount}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>
                CMO Conflicts <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={`${styles.metricValue} ${styles.warn}`}>
                {DEMO_PUBLISHER.cmoConflicts}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — writer overview + activity */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Writer Overview <span className={styles.placeholderTag}>soon</span>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Writer</th>
                <th>Works</th>
                <th>Registered</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_WRITERS.map((w) => (
                <tr key={w.name}>
                  <td>{w.name}</td>
                  <td>{w.works}</td>
                  <td className={w.tone === "ok" ? styles.ok : styles.warn}>{w.registered}</td>
                  <td>{w.issues}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.cardTitle} style={{ marginTop: 20 }}>
            Recent Publisher Activity <span className={styles.placeholderTag}>soon</span>
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
