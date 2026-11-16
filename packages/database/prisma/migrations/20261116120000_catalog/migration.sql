-- Additive: the per-space CatalogItem table and two nullable Prestation columns linking a line to its catalog item and the list price at pick time. No row is updated.
-- CreateEnum
CREATE TYPE "CatalogBilling" AS ENUM ('ONE_TIME', 'MONTHLY');

-- AlterTable
ALTER TABLE "Prestation" ADD COLUMN     "catalogItemId" TEXT,
ADD COLUMN     "listUnitPrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "category" TEXT,
    "pack" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'jour',
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "billing" "CatalogBilling" NOT NULL DEFAULT 'ONE_TIME',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogItem_spaceId_active_idx" ON "CatalogItem"("spaceId", "active");

-- CreateIndex
CREATE INDEX "Prestation_catalogItemId_idx" ON "Prestation"("catalogItemId");

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestation" ADD CONSTRAINT "Prestation_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

