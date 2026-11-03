-- Providers become global: merge the per-space copies of one provider, keyed on email.
CREATE TEMP TABLE provider_merge AS
WITH ranked AS (
  SELECT p.id,
         lower(trim(p.email)) AS key,
         (SELECT count(*) FROM "Document" d WHERE d."providerId" = p.id)
           + (SELECT count(*) FROM "MissionProvider" mp WHERE mp."providerId" = p.id)
           + (SELECT count(*) FROM "Prestation" pr WHERE pr."providerId" = p.id) AS refs,
         p."createdAt"
  FROM "Provider" p
  WHERE nullif(trim(p.email), '') IS NOT NULL
),
ordered AS (
  SELECT id, key,
         first_value(id) OVER (PARTITION BY key ORDER BY refs DESC, "createdAt" DESC, id) AS survivor
  FROM ranked
)
SELECT id AS duplicate, survivor FROM ordered WHERE id <> survivor;

UPDATE "Provider" s SET
  "legalName"   = coalesce(s."legalName",   f."legalName"),
  "address"     = coalesce(s."address",     f."address"),
  "city"        = coalesce(s."city",        f."city"),
  "postalCode"  = coalesce(s."postalCode",  f."postalCode"),
  "siret"       = coalesce(s."siret",       f."siret"),
  "tvaIntracom" = coalesce(s."tvaIntracom", f."tvaIntracom"),
  "legalForm"   = coalesce(s."legalForm",   f."legalForm"),
  "shareCapital"= coalesce(s."shareCapital",f."shareCapital"),
  "rcsCity"     = coalesce(s."rcsCity",     f."rcsCity"),
  "apeCode"     = coalesce(s."apeCode",     f."apeCode"),
  "phone"       = coalesce(s."phone",       f."phone"),
  "bankName"    = coalesce(s."bankName",    f."bankName"),
  "iban"        = coalesce(s."iban",        f."iban"),
  "bic"         = coalesce(s."bic",         f."bic"),
  "logoUrl"     = coalesce(s."logoUrl",     f."logoUrl")
FROM (
  SELECT m.survivor,
         max(p."legalName") AS "legalName", max(p."address") AS "address", max(p."city") AS "city",
         max(p."postalCode") AS "postalCode", max(p."siret") AS "siret",
         max(p."tvaIntracom") AS "tvaIntracom", max(p."legalForm") AS "legalForm",
         max(p."shareCapital") AS "shareCapital", max(p."rcsCity") AS "rcsCity",
         max(p."apeCode") AS "apeCode", max(p."phone") AS "phone", max(p."bankName") AS "bankName",
         max(p."iban") AS "iban", max(p."bic") AS "bic", max(p."logoUrl") AS "logoUrl"
  FROM provider_merge m JOIN "Provider" p ON p.id = m.duplicate
  GROUP BY m.survivor
) f
WHERE s.id = f.survivor;

UPDATE "Document" d SET "providerId" = m.survivor
FROM provider_merge m WHERE d."providerId" = m.duplicate;

UPDATE "Prestation" pr SET "providerId" = m.survivor
FROM provider_merge m WHERE pr."providerId" = m.duplicate;

DELETE FROM "MissionProvider" mp
USING provider_merge m
WHERE mp."providerId" = m.duplicate
  AND EXISTS (
    SELECT 1 FROM "MissionProvider" kept
    WHERE kept."missionId" = mp."missionId" AND kept."providerId" = m.survivor
  );

DELETE FROM "MissionProvider" mp
USING provider_merge m, "MissionProvider" other
WHERE mp."providerId" = m.duplicate
  AND other."missionId" = mp."missionId"
  AND other."providerId" IN (SELECT duplicate FROM provider_merge WHERE survivor = m.survivor)
  AND other.id < mp.id;

UPDATE "MissionProvider" mp SET "providerId" = m.survivor
FROM provider_merge m WHERE mp."providerId" = m.duplicate;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM provider_merge m
    WHERE EXISTS (SELECT 1 FROM "Document" WHERE "providerId" = m.duplicate)
       OR EXISTS (SELECT 1 FROM "Prestation" WHERE "providerId" = m.duplicate)
       OR EXISTS (SELECT 1 FROM "MissionProvider" WHERE "providerId" = m.duplicate)
  ) THEN
    RAISE EXCEPTION 'provider merge left references on a duplicate';
  END IF;
END $$;

DELETE FROM "Provider" p USING provider_merge m WHERE p.id = m.duplicate;

DROP TABLE provider_merge;

-- Every client, mission, document and payment belongs to a space.
DO $$
DECLARE
  orphans bigint;
BEGIN
  SELECT (SELECT count(*) FROM "Client" WHERE "spaceId" IS NULL)
       + (SELECT count(*) FROM "Mission" WHERE "spaceId" IS NULL)
       + (SELECT count(*) FROM "Document" WHERE "spaceId" IS NULL)
       + (SELECT count(*) FROM "Payment" WHERE "spaceId" IS NULL)
    INTO orphans;
  IF orphans > 0 THEN
    RAISE EXCEPTION '% clients, missions, documents or payments have no space; move them into a space first', orphans;
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Mission" DROP CONSTRAINT "Mission_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Provider" DROP CONSTRAINT "Provider_spaceId_fkey";

-- DropIndex
DROP INDEX "Provider_spaceId_idx";

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "spaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "spaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Mission" ALTER COLUMN "spaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "spaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Provider" DROP COLUMN "spaceId";

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
