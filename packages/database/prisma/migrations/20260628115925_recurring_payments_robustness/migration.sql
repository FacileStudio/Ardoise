-- CreateEnum
CREATE TYPE "PaymentInvoiceStatus" AS ENUM ('PAID', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'PAST_DUE';
ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "receiptAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "receiptError" TEXT,
ADD COLUMN     "stripeInvoiceId" TEXT;

-- CreateTable
CREATE TABLE "PaymentInvoice" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentInvoiceStatus" NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInvoice_stripeInvoiceId_key" ON "PaymentInvoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "PaymentInvoice_paymentId_idx" ON "PaymentInvoice"("paymentId");

-- AddForeignKey
ALTER TABLE "PaymentInvoice" ADD CONSTRAINT "PaymentInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
