-- AlterTable
ALTER TABLE "Artist" ADD COLUMN "bankCountryCode" TEXT;
ALTER TABLE "Artist" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "Artist" ADD COLUMN "dateOfBirth" DATETIME;
ALTER TABLE "Artist" ADD COLUMN "primaryGenre" TEXT;

-- CreateTable
CREATE TABLE "SoundexchangePacket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "artistId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "lodBundlePath" TEXT,
    "catalogCsvPath" TEXT,
    "summaryPdfPath" TEXT,
    "hash" TEXT,
    "note" TEXT,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SoundexchangePacket_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SoundexchangePacket_tenantId_idx" ON "SoundexchangePacket"("tenantId");

-- CreateIndex
CREATE INDEX "SoundexchangePacket_artistId_idx" ON "SoundexchangePacket"("artistId");

-- CreateIndex
CREATE INDEX "SoundexchangePacket_status_idx" ON "SoundexchangePacket"("status");
