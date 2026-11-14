-- Additive: per-space Plume account columns (all nullable) and the OutboundEmail ledger that caps tenant mail per space and per sender. No row is updated.
-- AlterTable
ALTER TABLE "SpaceSettings" ADD COLUMN     "plumeApiToken" TEXT,
ADD COLUMN     "plumeWebhookId" TEXT,
ADD COLUMN     "plumeWebhookSecret" TEXT;

-- CreateTable
CREATE TABLE "OutboundEmail" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "spaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboundEmail_spaceId_createdAt_idx" ON "OutboundEmail"("spaceId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundEmail_userId_createdAt_idx" ON "OutboundEmail"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "OutboundEmail" ADD CONSTRAINT "OutboundEmail_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundEmail" ADD CONSTRAINT "OutboundEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

