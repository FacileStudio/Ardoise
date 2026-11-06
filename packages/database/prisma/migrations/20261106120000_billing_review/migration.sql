-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DuplicateSubscription" (
    "id" TEXT NOT NULL,
    "registreSpaceId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DuplicateSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateSubscription_stripeSubscriptionId_key" ON "DuplicateSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "DuplicateSubscription_registreSpaceId_idx" ON "DuplicateSubscription"("registreSpaceId");


-- The seeded Solo plan is the free plan
UPDATE "Plan" SET "isFree" = true WHERE "key" = 'solo';
