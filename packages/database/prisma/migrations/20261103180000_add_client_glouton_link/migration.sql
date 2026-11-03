-- AlterTable
ALTER TABLE "Client" ADD COLUMN "gloutonCompanyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_gloutonCompanyId_key" ON "Client"("gloutonCompanyId");
