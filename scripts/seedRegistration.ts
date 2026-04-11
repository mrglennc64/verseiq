// Seed demo artists + registration rows so the Registration Hub has something
// to render during development and smoke tests.
//
// Usage: npx tsx scripts/seedRegistration.ts
// Safe to re-run — upserts by stageName.

import "./loadEnv";
import { prisma } from "../lib/db";
import { setArtistRegistrationStatus } from "../lib/registration/status";

const DEMO = [
  {
    legalName: "Jane Doe",
    stageName: "Jane Doe",
    email: "jane@example.com",
    statuses: {
      SOUNDEXCHANGE: "PACKET_GENERATED",
      MLC: "NOT_STARTED",
    },
  },
  {
    legalName: "Marcus Chen",
    stageName: "Ritual Glow",
    email: "marcus@example.com",
    statuses: {
      SOUNDEXCHANGE: "ARTIST_ACTION_REQUIRED",
      MLC: "INTAKE_IN_PROGRESS",
    },
  },
  {
    legalName: "Ana Ruiz",
    stageName: "Ana Ruiz",
    email: "ana@example.com",
    statuses: {
      SOUNDEXCHANGE: "ACTIVE",
      MLC: "ACTIVE",
    },
  },
  {
    legalName: "The Uphill Vultures LLC",
    stageName: "Uphill Vultures",
    email: "band@example.com",
    statuses: {
      SOUNDEXCHANGE: "SUBMITTED",
      MLC: "PACKET_GENERATED",
    },
  },
] as const;

async function main() {
  for (const demo of DEMO) {
    // Upsert the artist by stageName (unique enough for demo data).
    const existing = await prisma.artist.findFirst({
      where: { stageName: demo.stageName },
    });

    const artist = existing
      ? existing
      : await prisma.artist.create({
          data: {
            legalName: demo.legalName,
            stageName: demo.stageName,
            email: demo.email,
          },
        });

    for (const [org, status] of Object.entries(demo.statuses)) {
      await setArtistRegistrationStatus({
        artistId: artist.id,
        org: org as any,
        status: status as any,
        updatedBy: "seed",
      });
    }

    console.log(`Seeded ${demo.stageName} (${artist.id})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
