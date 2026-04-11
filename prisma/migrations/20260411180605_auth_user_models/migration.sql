-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'artist',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Artist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "userId" TEXT,
    "legalName" TEXT NOT NULL,
    "stageName" TEXT,
    "address" TEXT,
    "email" TEXT,
    "soundexchangeId" TEXT,
    "mlcId" TEXT,
    "proAffiliation" TEXT,
    "spotifyArtistId" TEXT,
    "deezerArtistId" TEXT,
    "musicbrainzId" TEXT,
    "dateOfBirth" DATETIME,
    "countryCode" TEXT,
    "bankCountryCode" TEXT,
    "primaryGenre" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Artist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Artist" ("address", "bankCountryCode", "countryCode", "createdAt", "dateOfBirth", "deezerArtistId", "email", "id", "legalName", "mlcId", "musicbrainzId", "primaryGenre", "proAffiliation", "soundexchangeId", "spotifyArtistId", "stageName", "tenantId") SELECT "address", "bankCountryCode", "countryCode", "createdAt", "dateOfBirth", "deezerArtistId", "email", "id", "legalName", "mlcId", "musicbrainzId", "primaryGenre", "proAffiliation", "soundexchangeId", "spotifyArtistId", "stageName", "tenantId" FROM "Artist";
DROP TABLE "Artist";
ALTER TABLE "new_Artist" RENAME TO "Artist";
CREATE INDEX "Artist_tenantId_idx" ON "Artist"("tenantId");
CREATE INDEX "Artist_userId_idx" ON "Artist"("userId");
CREATE INDEX "Artist_spotifyArtistId_idx" ON "Artist"("spotifyArtistId");
CREATE INDEX "Artist_deezerArtistId_idx" ON "Artist"("deezerArtistId");
CREATE INDEX "Artist_musicbrainzId_idx" ON "Artist"("musicbrainzId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
