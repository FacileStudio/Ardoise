-- An appel de fonds keeps its free-text reference in "invoiceNumber" but leaves the invoice sequence:
-- the invoice index skips it, and a second index keeps appel de fonds references unique among themselves.
-- Both indexes cover a subset of the rows of the index they replace, so they build on any data it accepted.
-- No row is updated. A space with duplicates skips the index with a notice, like the original migration.
DO $$
BEGIN
    DROP INDEX IF EXISTS "Document_spaceId_invoiceNumber_key";

    IF EXISTS (
        SELECT 1 FROM "Document" WHERE "invoiceNumber" IS NOT NULL AND "type" <> 'appel_de_fonds'
        GROUP BY "spaceId", "invoiceNumber" HAVING count(*) > 1
    ) THEN
        RAISE NOTICE 'Document_spaceId_invoiceNumber_key skipped: duplicate invoice numbers exist in a space';
    ELSE
        CREATE UNIQUE INDEX "Document_spaceId_invoiceNumber_key" ON "Document"("spaceId", "invoiceNumber")
            WHERE "invoiceNumber" IS NOT NULL AND "type" <> 'appel_de_fonds';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "Document" WHERE "invoiceNumber" IS NOT NULL AND "type" = 'appel_de_fonds'
        GROUP BY "spaceId", "invoiceNumber" HAVING count(*) > 1
    ) THEN
        RAISE NOTICE 'Document_spaceId_appelDeFondsRef_key skipped: duplicate appel de fonds references exist in a space';
    ELSE
        CREATE UNIQUE INDEX "Document_spaceId_appelDeFondsRef_key" ON "Document"("spaceId", "invoiceNumber")
            WHERE "invoiceNumber" IS NOT NULL AND "type" = 'appel_de_fonds';
    END IF;
END $$;
