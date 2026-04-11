// Registration Hub — status model, types, and aggregation helpers.
// This file is the single source of truth for status codes and org names.
// Used by both the admin dashboard and the artist-facing registration hub.

import { prisma } from "../db";

// ---------------------------------------------------------------------------
// Status codes — in roughly the order an artist progresses through them.
// ---------------------------------------------------------------------------
export const REGISTRATION_STATUSES = [
  "NOT_STARTED",
  "INTAKE_IN_PROGRESS",
  "PACKET_GENERATED",
  "ARTIST_ACTION_REQUIRED",
  "SUBMITTED",
  "VERIFIED",
  "ACTIVE",
] as const;

export type RegistrationStatusCode = (typeof REGISTRATION_STATUSES)[number];

export function isValidStatus(value: string): value is RegistrationStatusCode {
  return (REGISTRATION_STATUSES as readonly string[]).includes(value);
}

// Human-readable labels for UI.
export const STATUS_LABELS: Record<RegistrationStatusCode, string> = {
  NOT_STARTED: "Not started",
  INTAKE_IN_PROGRESS: "Intake in progress",
  PACKET_GENERATED: "Packet generated",
  ARTIST_ACTION_REQUIRED: "Artist action required",
  SUBMITTED: "Submitted",
  VERIFIED: "Verified",
  ACTIVE: "Active",
};

// ---------------------------------------------------------------------------
// Organizations — royalty collection societies and CMOs we track.
// ---------------------------------------------------------------------------
export const REGISTRATION_ORGS = [
  "SOUNDEXCHANGE",
  "MLC",
  "ASCAP",
  "BMI",
  "SOCAN",
  "PRS",
  "GMR",
] as const;

export type RegistrationOrg = (typeof REGISTRATION_ORGS)[number];

export function isValidOrg(value: string): value is RegistrationOrg {
  return (REGISTRATION_ORGS as readonly string[]).includes(value);
}

// Orgs included in the "core" overall-status calculation.
// Extend later when we add full ASCAP/BMI/etc support.
const CORE_ORGS: RegistrationOrg[] = ["SOUNDEXCHANGE", "MLC"];

// ---------------------------------------------------------------------------
// Overall status — rolls per-org statuses into a single top-level badge.
// ---------------------------------------------------------------------------
export type OverallStatus = "FULLY_REGISTERED" | "ACTION_REQUIRED" | "IN_PROGRESS" | "INCOMPLETE";

export function calculateOverall(statuses: Record<string, RegistrationStatusCode | undefined>): OverallStatus {
  const core = CORE_ORGS.map((org) => statuses[org] ?? "NOT_STARTED");

  if (core.every((s) => s === "ACTIVE")) return "FULLY_REGISTERED";
  if (core.some((s) => s === "ARTIST_ACTION_REQUIRED")) return "ACTION_REQUIRED";
  if (core.some((s) => s === "PACKET_GENERATED" || s === "SUBMITTED" || s === "VERIFIED")) return "IN_PROGRESS";
  if (core.some((s) => s === "INTAKE_IN_PROGRESS")) return "IN_PROGRESS";
  return "INCOMPLETE";
}

// ---------------------------------------------------------------------------
// Data helpers — these are the only two functions route handlers should use
// to read registration state. They normalize missing rows to NOT_STARTED so
// callers never have to think about null.
// ---------------------------------------------------------------------------

export type ArtistRegistrationRow = {
  org: RegistrationOrg;
  status: RegistrationStatusCode;
  note: string | null;
  updatedAt: string;
};

export async function getArtistRegistrationStatus(artistId: string) {
  const rows = await prisma.registrationStatus.findMany({
    where: { artistId },
    orderBy: { org: "asc" },
  });

  const byOrg: Record<string, RegistrationStatusCode | undefined> = {};
  const list: ArtistRegistrationRow[] = [];

  for (const row of rows) {
    if (!isValidOrg(row.org) || !isValidStatus(row.status)) continue;
    byOrg[row.org] = row.status;
    list.push({
      org: row.org,
      status: row.status,
      note: row.note,
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  // Fill in the core orgs with NOT_STARTED defaults if missing.
  for (const org of CORE_ORGS) {
    if (!byOrg[org]) {
      byOrg[org] = "NOT_STARTED";
      list.push({
        org,
        status: "NOT_STARTED",
        note: null,
        updatedAt: new Date(0).toISOString(),
      });
    }
  }

  return {
    artistId,
    byOrg: byOrg as Record<RegistrationOrg, RegistrationStatusCode>,
    list,
    overall: calculateOverall(byOrg),
  };
}

// Upsert a single (artist, org) status row.
export async function setArtistRegistrationStatus(args: {
  artistId: string;
  org: RegistrationOrg;
  status: RegistrationStatusCode;
  note?: string | null;
  updatedBy?: string | null;
}) {
  return prisma.registrationStatus.upsert({
    where: { artistId_org: { artistId: args.artistId, org: args.org } },
    create: {
      artistId: args.artistId,
      org: args.org,
      status: args.status,
      note: args.note ?? null,
      updatedBy: args.updatedBy ?? null,
    },
    update: {
      status: args.status,
      note: args.note ?? null,
      updatedBy: args.updatedBy ?? null,
    },
  });
}
