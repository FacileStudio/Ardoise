ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE 'AWAITING_CONFIRMATION';

CREATE TYPE "PaymentDeclaredMethod" AS ENUM ('TRANSFER', 'CHEQUE', 'OTHER');

ALTER TABLE "Payment"
  ADD COLUMN "declaredMethod" "PaymentDeclaredMethod",
  ADD COLUMN "declaredReference" TEXT,
  ADD COLUMN "declaredPaidOn" TIMESTAMP(3),
  ADD COLUMN "declaredAt" TIMESTAMP(3),
  ADD COLUMN "declaredVia" TEXT,
  ADD COLUMN "stripeCheckoutSessionId" TEXT;

ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentLink_tokenHash_key" ON "PaymentLink"("tokenHash");
CREATE INDEX "PaymentLink_paymentId_idx" ON "PaymentLink"("paymentId");
CREATE INDEX "PaymentLink_expiresAt_idx" ON "PaymentLink"("expiresAt");

ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
