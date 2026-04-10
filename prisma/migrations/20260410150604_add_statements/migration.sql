-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "sourcePlatform" TEXT NOT NULL,
    "sourceFilename" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "matchedRows" INTEGER NOT NULL DEFAULT 0,
    "unmatchedRows" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "unmatchedAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "StatementLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "statementId" TEXT NOT NULL,
    "recordingId" TEXT,
    "rawIsrc" TEXT,
    "rawTitle" TEXT,
    "rawArtist" TEXT,
    "rawPeriod" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "rawRow" JSONB NOT NULL,
    CONSTRAINT "StatementLine_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StatementLine_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Statement_tenantId_idx" ON "Statement"("tenantId");

-- CreateIndex
CREATE INDEX "Statement_sourcePlatform_idx" ON "Statement"("sourcePlatform");

-- CreateIndex
CREATE INDEX "StatementLine_tenantId_idx" ON "StatementLine"("tenantId");

-- CreateIndex
CREATE INDEX "StatementLine_statementId_idx" ON "StatementLine"("statementId");

-- CreateIndex
CREATE INDEX "StatementLine_recordingId_idx" ON "StatementLine"("recordingId");

-- CreateIndex
CREATE INDEX "StatementLine_matched_idx" ON "StatementLine"("matched");
