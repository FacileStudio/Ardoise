-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('none', 'sent', 'signed', 'declined');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "signatureStatus" "SignatureStatus" NOT NULL DEFAULT 'none',
ADD COLUMN "plumeDocumentId" TEXT,
ADD COLUMN "plumeUrl" TEXT,
ADD COLUMN "signedAt" TIMESTAMP(3),
ADD COLUMN "nuageArchivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Document_plumeDocumentId_idx" ON "Document"("plumeDocumentId");
