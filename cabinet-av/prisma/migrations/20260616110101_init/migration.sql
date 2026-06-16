-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nume" TEXT NOT NULL,
    "prenume" TEXT NOT NULL,
    "idnp" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "adresa" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activ',
    "aiAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numar" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "instanta" TEXT,
    "judecator" TEXT,
    "stare" TEXT NOT NULL DEFAULT 'deschis',
    "articole" TEXT,
    "sumaLitigiu" REAL,
    "descriere" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Case_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nume" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "categorie" TEXT,
    "clientId" TEXT,
    "caseId" TEXT,
    "filePath" TEXT,
    "htmlContent" TEXT,
    "textContent" TEXT,
    "containsSensitive" BOOLEAN NOT NULL DEFAULT false,
    "ocrStatus" TEXT,
    "ocrFields" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "reminderSent3" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent1" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'activ',
    "descriere" TEXT,
    CONSTRAINT "Deadline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Email" (
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
    CONSTRAINT "Email_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Email_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "structuredData" TEXT,
    "durata" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consultation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "caseId" TEXT,
    "categorie" TEXT NOT NULL,
    "descriere" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "durata" INTEGER,
    "automatic" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "numar" TEXT,
    "data" DATETIME NOT NULL,
    "onorariu" REAL,
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activ',
    CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "continut" TEXT NOT NULL,
    "confidential" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Note_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "platforma" TEXT NOT NULL,
    "aiAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "recentMessages" TEXT NOT NULL,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LegislativeAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titlu" TEXT NOT NULL,
    "descriere" TEXT NOT NULL,
    "actNormativ" TEXT NOT NULL,
    "articol" TEXT,
    "affectedCaseIds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'noua',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "caseId" TEXT,
    "messages" TEXT NOT NULL,
    "sursa" TEXT NOT NULL DEFAULT 'dashboard',
    "mod" TEXT NOT NULL DEFAULT 'lege',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nume" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "continut" TEXT NOT NULL,
    "fields" TEXT NOT NULL,
    "activ" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_idnp_key" ON "Client"("idnp");
