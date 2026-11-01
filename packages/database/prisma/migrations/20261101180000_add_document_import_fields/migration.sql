-- CreateEnum
CREATE TYPE "DocumentSource" AS ENUM ('generated', 'imported');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "source" "DocumentSource" NOT NULL DEFAULT 'generated',
ADD COLUMN "issuedAt" TIMESTAMP(3),
ADD COLUMN "plumeClientSignUrl" TEXT;
