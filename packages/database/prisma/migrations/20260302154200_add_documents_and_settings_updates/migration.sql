-- CreateEnum for Document types
DO $$ BEGIN
 CREATE TYPE "DocumentType" AS ENUM ('prestation', 'maintenance', 'contrat_prestation', 'contrat_maintenance', 'back_contractuel', 'appel_de_fonds', 'prestation_barman', 'prestation_design', 'prestation_dev', 'prestation_photo', 'prestation_video', 'prestation_formation', 'prestation_btp');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add serviceData column to Document
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "serviceData" JSONB;

-- Change Document.type from TEXT to DocumentType enum (preserve existing data)
ALTER TABLE "Document"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE "DocumentType" USING ("type"::text::"DocumentType");

-- Create PaymentDocument junction table
CREATE TABLE IF NOT EXISTS "PaymentDocument" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for PaymentDocument
DO $$ BEGIN
 CREATE INDEX IF NOT EXISTS "PaymentDocument_paymentId_idx" ON "PaymentDocument"("paymentId");
 CREATE INDEX IF NOT EXISTS "PaymentDocument_documentId_idx" ON "PaymentDocument"("documentId");
 CREATE UNIQUE INDEX IF NOT EXISTS "PaymentDocument_paymentId_documentId_key" ON "PaymentDocument"("paymentId", "documentId");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;

-- Add foreign keys for PaymentDocument
DO $$ BEGIN
 ALTER TABLE "PaymentDocument" ADD CONSTRAINT "PaymentDocument_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "PaymentDocument" ADD CONSTRAINT "PaymentDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add Settings columns for document numbering
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "invoiceNumberFormat" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "quoteNumberFormat" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "contractNumberFormat" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "nextQuoteNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "nextContractNumber" INTEGER NOT NULL DEFAULT 1;

-- Add index on Document.type (if not exists)
CREATE INDEX IF NOT EXISTS "Document_type_idx" ON "Document"("type");
