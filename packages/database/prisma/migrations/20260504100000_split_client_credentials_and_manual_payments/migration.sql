ALTER TABLE "Client"
  ADD COLUMN "contactFirstName" TEXT,
  ADD COLUMN "contactLastName" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ALTER COLUMN "userId" DROP NOT NULL;

UPDATE "Client" c
SET
  "contactFirstName" = u."firstName",
  "contactLastName" = u."lastName",
  "contactEmail" = u."email"
FROM "User" u
WHERE c."userId" = u."id";

ALTER TABLE "Client"
  ALTER COLUMN "contactFirstName" SET NOT NULL,
  ALTER COLUMN "contactLastName" SET NOT NULL;

CREATE INDEX "Client_contactEmail_idx" ON "Client"("contactEmail");

CREATE TYPE "PaymentCollectionMethod" AS ENUM ('STRIPE', 'MANUAL');

ALTER TABLE "Payment"
  ADD COLUMN "collectionMethod" "PaymentCollectionMethod" NOT NULL DEFAULT 'STRIPE',
  ADD COLUMN "reference" TEXT;

CREATE INDEX "Payment_collectionMethod_idx" ON "Payment"("collectionMethod");
