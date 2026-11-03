-- AlterTable
ALTER TABLE "Space" ADD COLUMN "registreSpaceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Space_registreSpaceId_key" ON "Space"("registreSpaceId");
