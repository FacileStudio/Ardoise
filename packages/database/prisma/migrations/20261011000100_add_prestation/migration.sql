-- CreateEnum
CREATE TYPE "PrestationStatus" AS ENUM ('DRAFT', 'QUOTED', 'ACCEPTED', 'INVOICED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrestationProviderRole" AS ENUM ('LEAD', 'SUBCONTRACTOR');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "prestationId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "prestationId" TEXT;

-- CreateTable
CREATE TABLE "Prestation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PrestationStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL,
    "spaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrestationProvider" (
    "id" TEXT NOT NULL,
    "prestationId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "role" "PrestationProviderRole" NOT NULL DEFAULT 'LEAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrestationProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prestation_clientId_idx" ON "Prestation"("clientId");

-- CreateIndex
CREATE INDEX "Prestation_status_idx" ON "Prestation"("status");

-- CreateIndex
CREATE INDEX "Prestation_spaceId_idx" ON "Prestation"("spaceId");

-- CreateIndex
CREATE INDEX "PrestationProvider_prestationId_idx" ON "PrestationProvider"("prestationId");

-- CreateIndex
CREATE INDEX "PrestationProvider_providerId_idx" ON "PrestationProvider"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "PrestationProvider_prestationId_providerId_key" ON "PrestationProvider"("prestationId", "providerId");

-- CreateIndex
CREATE INDEX "Document_prestationId_idx" ON "Document"("prestationId");

-- CreateIndex
CREATE INDEX "Payment_prestationId_idx" ON "Payment"("prestationId");

-- CreateIndex
CREATE INDEX "Payment_documentId_idx" ON "Payment"("documentId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "Prestation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "Prestation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestation" ADD CONSTRAINT "Prestation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestation" ADD CONSTRAINT "Prestation_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestationProvider" ADD CONSTRAINT "PrestationProvider_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "Prestation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestationProvider" ADD CONSTRAINT "PrestationProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

