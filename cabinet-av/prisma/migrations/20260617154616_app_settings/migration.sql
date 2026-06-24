-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "hourlyRate" REAL NOT NULL DEFAULT 800,
    "numeCabinet" TEXT NOT NULL DEFAULT 'Cabinet Avocat Ludmila Trofim',
    "codFiscal" TEXT NOT NULL DEFAULT '1012345678901',
    "adresaSediu" TEXT NOT NULL DEFAULT 'mun. Chișinău, str. București 1',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
