// Validator for SoundExchange intake.
//
// SE registration requires a known-good set of artist-level fields before a
// packet can be generated. This module is the single source of truth for that
// list — API routes, the UI, and packetBuilder all read from REQUIRED_FIELDS
// so adding a field in one place propagates everywhere.
//
// NOTE: we intentionally do NOT collect tax-ID/SSN here. SoundExchange handles
// that on their side during the artist's own verification step.

import type { Artist, Recording } from "@prisma/client";

export type SoundexchangeValidationIssue = {
  field: string;
  message: string;
};

export type SoundexchangeValidationResult = {
  ok: boolean;
  issues: SoundexchangeValidationIssue[];
  missingFields: string[];
  recordingCount: number;
  lodCount: number;
};

export const REQUIRED_ARTIST_FIELDS = [
  "legalName",
  "address",
  "email",
  "dateOfBirth",
  "countryCode",
  "bankCountryCode",
  "primaryGenre",
] as const;

export type RequiredArtistField = (typeof REQUIRED_ARTIST_FIELDS)[number];

export const FIELD_LABELS: Record<RequiredArtistField, string> = {
  legalName: "Legal name",
  address: "Mailing address",
  email: "Email",
  dateOfBirth: "Date of birth",
  countryCode: "Country (ISO-2)",
  bankCountryCode: "Bank country (ISO-2)",
  primaryGenre: "Primary genre",
};

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

export function validateArtistForSoundexchange(
  artist: Artist,
  recordings: Pick<Recording, "id" | "isrc" | "title">[],
  lodCount: number
): SoundexchangeValidationResult {
  const issues: SoundexchangeValidationIssue[] = [];
  const missing: string[] = [];

  for (const field of REQUIRED_ARTIST_FIELDS) {
    const value = (artist as unknown as Record<string, unknown>)[field];
    if (!hasValue(value)) {
      missing.push(field);
      issues.push({
        field,
        message: `${FIELD_LABELS[field]} is required`,
      });
    }
  }

  if (recordings.length === 0) {
    issues.push({
      field: "recordings",
      message: "Artist has no recordings in the catalog",
    });
  } else {
    const missingIsrc = recordings.filter((r) => !r.isrc?.trim()).length;
    if (missingIsrc > 0) {
      issues.push({
        field: "recordings.isrc",
        message: `${missingIsrc} recording(s) are missing an ISRC`,
      });
    }
  }

  if (lodCount === 0) {
    issues.push({
      field: "lods",
      message:
        "No Letters of Direction found for this artist. Generate LODs in the LOD slice before building the SE packet.",
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    missingFields: missing,
    recordingCount: recordings.length,
    lodCount,
  };
}
