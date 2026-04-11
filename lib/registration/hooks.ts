// Registration Hub — integration seams for the (future) SoundExchange and MLC
// packet-generation modules. Those modules will call these functions when their
// state advances, and the Registration Hub will surface the updated status.
//
// Today these are thin wrappers around setArtistRegistrationStatus. When the
// real modules land, wire them here — do NOT bypass this file and write to
// RegistrationStatus directly, so audit/logging stays in one place.

import { setArtistRegistrationStatus, type RegistrationOrg } from "./status";

export async function onIntakeStarted(artistId: string, org: RegistrationOrg) {
  return setArtistRegistrationStatus({
    artistId,
    org,
    status: "INTAKE_IN_PROGRESS",
    updatedBy: "system:intake",
  });
}

export async function onPacketGenerated(artistId: string, org: RegistrationOrg, note?: string) {
  return setArtistRegistrationStatus({
    artistId,
    org,
    status: "PACKET_GENERATED",
    note: note ?? null,
    updatedBy: "system:packet-generator",
  });
}

export async function onArtistActionRequired(artistId: string, org: RegistrationOrg, note?: string) {
  return setArtistRegistrationStatus({
    artistId,
    org,
    status: "ARTIST_ACTION_REQUIRED",
    note: note ?? null,
    updatedBy: "system:packet-generator",
  });
}

export async function onSubmitted(artistId: string, org: RegistrationOrg) {
  return setArtistRegistrationStatus({
    artistId,
    org,
    status: "SUBMITTED",
    updatedBy: "system:submission",
  });
}

export async function onVerified(artistId: string, org: RegistrationOrg) {
  return setArtistRegistrationStatus({
    artistId,
    org,
    status: "VERIFIED",
    updatedBy: "system:submission",
  });
}

export async function onActive(artistId: string, org: RegistrationOrg) {
  return setArtistRegistrationStatus({
    artistId,
    org,
    status: "ACTIVE",
    updatedBy: "system:submission",
  });
}
