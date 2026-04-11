"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  STATUS_LABELS,
  type RegistrationStatusCode,
} from "@/lib/registration/status";
import styles from "./page.module.css";

type OverallStatus = "FULLY_REGISTERED" | "ACTION_REQUIRED" | "IN_PROGRESS" | "INCOMPLETE";

type CatalogPreviewRow = {
  id: string;
  title: string;
  isrc: string;
  missingUpc: boolean;
};

type HubResponse = {
  artist: { id: string; legalName: string; stageName: string | null; email: string | null };
  soundexchange: RegistrationStatusCode;
  mlc: RegistrationStatusCode;
  byOrg: Record<string, RegistrationStatusCode>;
  overall: OverallStatus;
  catalog: {
    recordingCount: number;
    preview: CatalogPreviewRow[];
  };
};

// How far through the status lifecycle a given code is, 0..1. Used to turn
// the per-org status into a percentage for the progress bar.
const STATUS_PROGRESS: Record<RegistrationStatusCode, number> = {
  NOT_STARTED: 0,
  INTAKE_IN_PROGRESS: 0.2,
  PACKET_GENERATED: 0.5,
  ARTIST_ACTION_REQUIRED: 0.6,
  SUBMITTED: 0.75,
  VERIFIED: 0.9,
  ACTIVE: 1,
};

function percentFor(status: RegistrationStatusCode): number {
  return Math.round(STATUS_PROGRESS[status] * 100);
}

// Derive initials for the avatar. Falls back to "VQ".
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VQ";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function RegistrationHubContent() {
  const searchParams = useSearchParams();
  const artistId = searchParams.get("artistId") || "";

  const [data, setData] = useState<HubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      setError(
        "Sign in required — your artist ID will be loaded automatically after login. Real authentication is coming soon."
      );
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/artist/registration-hub/status?artistId=${encodeURIComponent(artistId)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load");
        if (!mounted) return;
        setData(json as HubResponse);
        setError(null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [artistId]);

  // Combined completion across the two core orgs we track today.
  const overallPercent = useMemo(() => {
    if (!data) return 0;
    const se = percentFor(data.soundexchange);
    const mlc = percentFor(data.mlc);
    return Math.round((se + mlc) / 2);
  }, [data]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading registration hub…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorBox}>{error || "Unable to load registration data."}</div>
      </div>
    );
  }

  const displayName = data.artist.stageName || data.artist.legalName;
  const sePercent = percentFor(data.soundexchange);
  const mlcPercent = percentFor(data.mlc);
  const metadataIssueCount = data.catalog.preview.filter((r) => r.missingUpc).length;

  return (
    <div className={styles.page}>
      <div className={styles.dashboard}>
        {/* LEFT COLUMN — artist + metrics */}
        <div className={styles.card}>
          <div className={styles.artistHeader}>
            <div className={styles.avatar}>{initialsFor(displayName)}</div>
            <div>
              <div className={styles.artistName}>{displayName}</div>
              <div className={styles.artistSub}>Connected to VerseIQ Royalty Recovery</div>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div>
              <div className={styles.healthLabel}>
                Catalog Health <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={`${styles.healthScore} ${styles.muted}`}>
                — <span>/ 100</span>
              </div>
            </div>
            <div>
              <div className={styles.healthLabel}>
                Next Payout <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={`${styles.metricValue} ${styles.muted}`}>Not available yet</div>
            </div>
          </div>

          <div className={styles.progressSection}>
            <div className={styles.healthLabel}>Registration Completion</div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${overallPercent}%` }} />
            </div>
            <div className={styles.progressMeta}>
              <span>SoundExchange {sePercent}%</span>
              <span>MLC {mlcPercent}%</span>
              <span className={styles.muted}>PRO —</span>
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Recordings</div>
              <div className={styles.metricValue}>{data.catalog.recordingCount}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>
                Works <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={`${styles.metricValue} ${styles.muted}`}>—</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Metadata Issues</div>
              <div
                className={`${styles.metricValue} ${
                  metadataIssueCount > 0 ? styles.warn : ""
                }`}
              >
                {metadataIssueCount > 0
                  ? `${metadataIssueCount} warning${metadataIssueCount === 1 ? "" : "s"}`
                  : "No issues"}
              </div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>
                Open Tasks <span className={styles.placeholderTag}>soon</span>
              </div>
              <div className={`${styles.metricValue} ${styles.muted}`}>—</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — tasks, activity, catalog preview */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              Tasks That Need Your Attention
              <span className={styles.placeholderTag}>soon</span>
            </div>
          </div>
          <ul className={styles.list}>
            <li className={styles.muted}>
              Task suggestions will appear here once you log in and connect your catalog.
            </li>
          </ul>

          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              Recent Activity
              <span className={styles.placeholderTag}>soon</span>
            </div>
          </div>
          <ul className={styles.list}>
            <li>
              SoundExchange: <span className={styles.ok}>{STATUS_LABELS[data.soundexchange]}</span>
            </li>
            <li>
              MLC: <span className={styles.ok}>{STATUS_LABELS[data.mlc]}</span>
            </li>
          </ul>

          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Catalog Preview</div>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>ISRC</th>
                <th>Status</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {data.catalog.preview.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.emptyRow}>
                    No recordings in your catalog yet.
                  </td>
                </tr>
              ) : (
                data.catalog.preview.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.isrc}</td>
                    <td className={styles.ok}>Registered</td>
                    <td className={row.missingUpc ? styles.warn : ""}>
                      {row.missingUpc ? "Missing UPC" : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function RegistrationHubPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <p>Loading registration hub…</p>
        </div>
      }
    >
      <RegistrationHubContent />
    </Suspense>
  );
}
