-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('FULL', 'DEPOSIT', 'BALANCE');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'devis';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceKind" "InvoiceKind",
ADD COLUMN     "sourceQuoteId" TEXT,
ADD COLUMN     "version" INTEGER;

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "depositPercent" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "Prestation" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'jour',
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prestation_missionId_idx" ON "Prestation"("missionId");

-- CreateIndex
CREATE INDEX "Prestation_providerId_idx" ON "Prestation"("providerId");

-- CreateIndex
CREATE INDEX "Document_sourceQuoteId_idx" ON "Document"("sourceQuoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_missionId_version_key" ON "Document"("missionId", "version");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_sourceQuoteId_fkey" FOREIGN KEY ("sourceQuoteId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestation" ADD CONSTRAINT "Prestation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestation" ADD CONSTRAINT "Prestation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

