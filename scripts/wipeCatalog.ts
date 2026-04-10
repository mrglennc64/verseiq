/**
 * Wipes all catalog data (artists, recordings, splits) for the current tenant.
 * Leaves LODs, submissions, tenant settings, and royalty scans intact.
 *
 * Run with: npx tsx scripts/wipeCatalog.ts
 */
import { prisma } from "../lib/db";
import { getCurrentTenantId } from "../lib/tenant";

async function main() {
  const tenantId = getCurrentTenantId();

  // Cascade deletes will handle splits and recordings, but we delete in order
  // to be explicit about what's removed and to log counts.
  const splits = await prisma.split.deleteMany({ where: { tenantId } });
  const recordings = await prisma.recording.deleteMany({ where: { tenantId } });
  const artists = await prisma.artist.deleteMany({ where: { tenantId } });

  console.log(`Wiped catalog for tenant "${tenantId}":`);
  console.log(`  ${splits.count} splits`);
  console.log(`  ${recordings.count} recordings`);
  console.log(`  ${artists.count} artists`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
