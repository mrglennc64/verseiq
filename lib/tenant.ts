import { prisma } from "@/lib/db";

/**
 * Hardcoded default tenant ID. Used everywhere until real auth/signup lands.
 *
 * Every Prisma model that holds tenant-scoped data has `tenantId String @default("default")`,
 * so this constant matches the column default. When real auth ships, replace
 * `getCurrentTenantId()` with a function that reads the tenant from the request session.
 */
export const DEFAULT_TENANT_ID = "default";

/**
 * Returns the tenant ID for the current request. Today this is always the default
 * tenant. Routes should call this instead of importing DEFAULT_TENANT_ID directly,
 * so swapping in real auth later is a one-file change.
 */
export function getCurrentTenantId(): string {
  return DEFAULT_TENANT_ID;
}

/**
 * Ensures the default tenant row exists. Idempotent — safe to call from any route.
 * Called lazily on first write so we don't need a separate seed step.
 */
export async function ensureDefaultTenant(): Promise<void> {
  await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_ID },
    update: {},
    create: {
      id: DEFAULT_TENANT_ID,
      slug: DEFAULT_TENANT_ID,
      name: "Default Tenant",
    },
  });
}
