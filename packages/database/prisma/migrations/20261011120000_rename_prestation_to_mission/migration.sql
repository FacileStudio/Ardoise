-- RenameEnum
ALTER TYPE "PrestationStatus" RENAME TO "MissionStatus";
ALTER TYPE "PrestationProviderRole" RENAME TO "MissionProviderRole";

-- RenameTable
ALTER TABLE "Prestation" RENAME TO "Mission";
ALTER TABLE "PrestationProvider" RENAME TO "MissionProvider";

-- RenameColumn
ALTER TABLE "MissionProvider" RENAME COLUMN "prestationId" TO "missionId";
ALTER TABLE "Document" RENAME COLUMN "prestationId" TO "missionId";
ALTER TABLE "Payment" RENAME COLUMN "prestationId" TO "missionId";

-- RenameConstraint
ALTER TABLE "Mission" RENAME CONSTRAINT "Prestation_pkey" TO "Mission_pkey";
ALTER TABLE "Mission" RENAME CONSTRAINT "Prestation_clientId_fkey" TO "Mission_clientId_fkey";
ALTER TABLE "Mission" RENAME CONSTRAINT "Prestation_spaceId_fkey" TO "Mission_spaceId_fkey";
ALTER TABLE "MissionProvider" RENAME CONSTRAINT "PrestationProvider_pkey" TO "MissionProvider_pkey";
ALTER TABLE "MissionProvider" RENAME CONSTRAINT "PrestationProvider_prestationId_fkey" TO "MissionProvider_missionId_fkey";
ALTER TABLE "MissionProvider" RENAME CONSTRAINT "PrestationProvider_providerId_fkey" TO "MissionProvider_providerId_fkey";
ALTER TABLE "Document" RENAME CONSTRAINT "Document_prestationId_fkey" TO "Document_missionId_fkey";
ALTER TABLE "Payment" RENAME CONSTRAINT "Payment_prestationId_fkey" TO "Payment_missionId_fkey";

-- RenameIndex
ALTER INDEX "Prestation_clientId_idx" RENAME TO "Mission_clientId_idx";
ALTER INDEX "Prestation_status_idx" RENAME TO "Mission_status_idx";
ALTER INDEX "Prestation_spaceId_idx" RENAME TO "Mission_spaceId_idx";
ALTER INDEX "PrestationProvider_prestationId_idx" RENAME TO "MissionProvider_missionId_idx";
ALTER INDEX "PrestationProvider_providerId_idx" RENAME TO "MissionProvider_providerId_idx";
ALTER INDEX "PrestationProvider_prestationId_providerId_key" RENAME TO "MissionProvider_missionId_providerId_key";
ALTER INDEX "Document_prestationId_idx" RENAME TO "Document_missionId_idx";
ALTER INDEX "Payment_prestationId_idx" RENAME TO "Payment_missionId_idx";
