-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "avatarUserId" TEXT,
    "coverUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Media_avatarUserId_fkey" FOREIGN KEY ("avatarUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Media_coverUserId_fkey" FOREIGN KEY ("coverUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_avatarUserId_key" ON "Media"("avatarUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_coverUserId_key" ON "Media"("coverUserId");
