-- AlterTable
ALTER TABLE "Artist" ADD COLUMN "deezerArtistId" TEXT;
ALTER TABLE "Artist" ADD COLUMN "musicbrainzId" TEXT;
ALTER TABLE "Artist" ADD COLUMN "spotifyArtistId" TEXT;

-- CreateTable
CREATE TABLE "RegistrationStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "artistId" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "note" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RegistrationStatus_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "artistId" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "note" TEXT,
    "sentBy" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReminderLog_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RegistrationStatus_tenantId_idx" ON "RegistrationStatus"("tenantId");

-- CreateIndex
CREATE INDEX "RegistrationStatus_org_idx" ON "RegistrationStatus"("org");

-- CreateIndex
CREATE INDEX "RegistrationStatus_status_idx" ON "RegistrationStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationStatus_artistId_org_key" ON "RegistrationStatus"("artistId", "org");

-- CreateIndex
CREATE INDEX "ReminderLog_tenantId_idx" ON "ReminderLog"("tenantId");

-- CreateIndex
CREATE INDEX "ReminderLog_artistId_idx" ON "ReminderLog"("artistId");

-- CreateIndex
CREATE INDEX "ReminderLog_org_idx" ON "ReminderLog"("org");

-- CreateIndex
CREATE INDEX "Artist_spotifyArtistId_idx" ON "Artist"("spotifyArtistId");

-- CreateIndex
CREATE INDEX "Artist_deezerArtistId_idx" ON "Artist"("deezerArtistId");

-- CreateIndex
CREATE INDEX "Artist_musicbrainzId_idx" ON "Artist"("musicbrainzId");
