-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expeditor" TEXT NOT NULL,
    "destinatar" TEXT NOT NULL,
    "subiect" TEXT NOT NULL,
    "continut" TEXT NOT NULL,
    "sursa" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "clientId" TEXT,
    "caseId" TEXT,
    "aiSummary" TEXT,
    "aiAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'nou',
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT,
    "relevant" BOOLEAN NOT NULL DEFAULT true,
    "categorie" TEXT,
    "aiProcessedAt" DATETIME,
    CONSTRAINT "Email_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Email_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Email" ("aiAction", "aiSummary", "attachments", "caseId", "clientId", "continut", "data", "destinatar", "expeditor", "hasAttachments", "id", "status", "subiect", "sursa") SELECT "aiAction", "aiSummary", "attachments", "caseId", "clientId", "continut", "data", "destinatar", "expeditor", "hasAttachments", "id", "status", "subiect", "sursa" FROM "Email";
DROP TABLE "Email";
ALTER TABLE "new_Email" RENAME TO "Email";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
