-- CreateTable
CREATE TABLE "Lod" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lodId" TEXT,
    "platform" TEXT NOT NULL,
    "packetPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "note" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_lodId_fkey" FOREIGN KEY ("lodId") REFERENCES "Lod" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
