-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT NOT NULL,
    "stageName" TEXT,
    "soundexchangeId" TEXT,
    "mlcId" TEXT,
    "proAffiliation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "artistId" TEXT NOT NULL,
    "isrc" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "releaseDate" DATETIME,
    "label" TEXT,
    "upc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recording_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Split" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "recordingId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "percentage" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Split_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "artistLegalName" TEXT NOT NULL,
    "artistAddress" TEXT NOT NULL,
    "artistEmail" TEXT NOT NULL,
    "representativeName" TEXT NOT NULL,
    "representativeEntity" TEXT NOT NULL,
    "feePercent" REAL NOT NULL,
    "isrcs" JSONB NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "pdfHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Lod" ("artistAddress", "artistEmail", "artistLegalName", "createdAt", "feePercent", "id", "isrcs", "pdfHash", "pdfPath", "representativeEntity", "representativeName") SELECT "artistAddress", "artistEmail", "artistLegalName", "createdAt", "feePercent", "id", "isrcs", "pdfHash", "pdfPath", "representativeEntity", "representativeName" FROM "Lod";
DROP TABLE "Lod";
ALTER TABLE "new_Lod" RENAME TO "Lod";
CREATE INDEX "Lod_tenantId_idx" ON "Lod"("tenantId");
CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "lodId" TEXT,
    "platform" TEXT NOT NULL,
    "packetPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "note" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_lodId_fkey" FOREIGN KEY ("lodId") REFERENCES "Lod" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Submission" ("createdAt", "id", "lodId", "note", "packetPath", "platform", "status", "submittedAt") SELECT "createdAt", "id", "lodId", "note", "packetPath", "platform", "status", "submittedAt" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
CREATE INDEX "Submission_tenantId_idx" ON "Submission"("tenantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Artist_tenantId_idx" ON "Artist"("tenantId");

-- CreateIndex
CREATE INDEX "Recording_tenantId_idx" ON "Recording"("tenantId");

-- CreateIndex
CREATE INDEX "Recording_artistId_idx" ON "Recording"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "Recording_tenantId_isrc_key" ON "Recording"("tenantId", "isrc");

-- CreateIndex
CREATE INDEX "Split_tenantId_idx" ON "Split"("tenantId");

-- CreateIndex
CREATE INDEX "Split_recordingId_idx" ON "Split"("recordingId");
