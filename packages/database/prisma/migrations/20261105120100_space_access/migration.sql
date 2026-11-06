-- A space marked platformStudio belongs to the platform operator's studio: only
-- such a space may collect payments through the platform Stripe account, mail
-- its clients through the platform SMTP, send contracts to Plume, archive them
-- in Nuage and use the shared providers.
ALTER TABLE "Space" ADD COLUMN "platformStudio" BOOLEAN NOT NULL DEFAULT false;

-- Providers become per space. Existing providers keep a null spaceId: they are
-- the shared providers of the platform studio spaces.
ALTER TABLE "Provider" ADD COLUMN "spaceId" TEXT;
CREATE INDEX "Provider_spaceId_idx" ON "Provider"("spaceId");
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Every space that already holds work was used by the platform studio before
-- Ardoise was multi-tenant, so it keeps payments, email and shared providers.
UPDATE "Space" s SET "platformStudio" = true
WHERE EXISTS (SELECT 1 FROM "Client" c WHERE c."spaceId" = s.id)
   OR EXISTS (SELECT 1 FROM "Document" d WHERE d."spaceId" = s.id)
   OR EXISTS (SELECT 1 FROM "Payment" p WHERE p."spaceId" = s.id)
   OR EXISTS (SELECT 1 FROM "Mission" m WHERE m."spaceId" = s.id);

-- No sign-in grants ADMIN any more. Former ADMIN rows become MEMBER: their
-- spaces come from Registre, platform powers from PLATFORM_STAFF_SUBS. Rows
-- are only relabelled, never deleted.
UPDATE "User" SET "role" = 'MEMBER' WHERE "role" = 'ADMIN';
