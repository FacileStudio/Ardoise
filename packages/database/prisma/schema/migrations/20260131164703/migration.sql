-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL DEFAULT '{}',
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "hashedPassword" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("accessTokenExpiresAt", "accountId", "createdAt", "encryptedData", "hashedPassword", "id", "providerId", "refreshTokenExpiresAt", "scope", "updatedAt", "userId") SELECT "accessTokenExpiresAt", "accountId", "createdAt", coalesce("encryptedData", '{}') AS "encryptedData", "hashedPassword", "id", "providerId", "refreshTokenExpiresAt", "scope", "updatedAt", "userId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
