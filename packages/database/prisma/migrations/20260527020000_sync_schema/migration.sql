-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "billingPostalCode" TEXT,
ADD COLUMN     "tvaIntracom" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "clientPostalCode" TEXT,
ADD COLUMN     "clientTvaIntracom" TEXT,
ADD COLUMN     "deliveryDate" TIMESTAMP(3),
ADD COLUMN     "lateFeeRate" TEXT NOT NULL DEFAULT '3 fois le taux d''intérêt légal en vigueur',
ADD COLUMN     "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "pdfHash" TEXT,
ADD COLUMN     "providerApeCode" TEXT,
ADD COLUMN     "providerLegalForm" TEXT,
ADD COLUMN     "providerPostalCode" TEXT,
ADD COLUMN     "providerRcsCity" TEXT,
ADD COLUMN     "providerShareCapital" DECIMAL(15,2),
ADD COLUMN     "providerTvaIntracom" TEXT,
ADD COLUMN     "recoveryFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 40,
ADD COLUMN     "vatExemptionMention" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "lastReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PaymentDocument" DROP COLUMN "createdAt",
ADD COLUMN     "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "apeCode" TEXT,
ADD COLUMN     "legalForm" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "rcsCity" TEXT,
ADD COLUMN     "shareCapital" DECIMAL(15,2),
ADD COLUMN     "tvaIntracom" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "companyApeCode" TEXT,
ADD COLUMN     "companyLegalForm" TEXT,
ADD COLUMN     "companyRcsCity" TEXT,
ADD COLUMN     "companyShareCapital" DECIMAL(15,2),
ADD COLUMN     "companyTvaIntracom" TEXT,
ADD COLUMN     "defaultLateFeeRate" TEXT DEFAULT '3 fois le taux d''intérêt légal en vigueur',
ADD COLUMN     "defaultPaymentTermsDays" INTEGER DEFAULT 30,
ADD COLUMN     "defaultRecoveryFeeAmount" DECIMAL(10,2) DEFAULT 40,
ADD COLUMN     "defaultVatExemptionMention" TEXT DEFAULT 'TVA non applicable, article 293 B du CGI',
ALTER COLUMN "invoiceNumberFormat" SET NOT NULL,
ALTER COLUMN "invoiceNumberFormat" SET DEFAULT 'FAC-{{year}}-{{number}}',
ALTER COLUMN "quoteNumberFormat" SET NOT NULL,
ALTER COLUMN "quoteNumberFormat" SET DEFAULT 'DEVIS-{{year}}-{{number}}',
ALTER COLUMN "contractNumberFormat" SET NOT NULL,
ALTER COLUMN "contractNumberFormat" SET DEFAULT 'CONT-{{year}}-{{number}}';

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_processedAt_idx" ON "WebhookEvent"("processedAt");

-- CreateIndex
CREATE INDEX "Document_clientName_idx" ON "Document"("clientName");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSubscriptionId_key" ON "Payment"("stripeSubscriptionId");
