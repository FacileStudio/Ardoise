-- Migration: Add PaymentDocument table for document attachments
-- Created: 2026-02-13

-- Create PaymentDocument junction table
CREATE TABLE IF NOT EXISTS "PaymentDocument" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentDocument_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint to prevent duplicate attachments
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentDocument_paymentId_documentId_key" ON "PaymentDocument"("paymentId", "documentId");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "PaymentDocument_paymentId_idx" ON "PaymentDocument"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentDocument_documentId_idx" ON "PaymentDocument"("documentId");

-- Add foreign keys with cascade delete (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PaymentDocument_paymentId_fkey'
    ) THEN
        ALTER TABLE "PaymentDocument"
        ADD CONSTRAINT "PaymentDocument_paymentId_fkey"
        FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PaymentDocument_documentId_fkey'
    ) THEN
        ALTER TABLE "PaymentDocument"
        ADD CONSTRAINT "PaymentDocument_documentId_fkey"
        FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
