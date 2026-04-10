-- AlterTable
ALTER TABLE "Artist" ADD COLUMN "address" TEXT;
ALTER TABLE "Artist" ADD COLUMN "email" TEXT;

-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "defaultRepName" TEXT,
    "defaultRepEntity" TEXT,
    "defaultFeePercent" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");
