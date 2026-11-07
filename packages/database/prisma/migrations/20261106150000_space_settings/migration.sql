CREATE TABLE "SpaceSettings" (
    "spaceId" TEXT NOT NULL,
    "invoiceNumberFormat" TEXT NOT NULL DEFAULT 'FAC-{{year}}-{{number}}',
    "quoteNumberFormat" TEXT NOT NULL DEFAULT 'DEVIS-{{year}}-{{number}}',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "lateFeeRate" TEXT NOT NULL DEFAULT '3 fois le taux d''intérêt légal en vigueur',
    "recoveryFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 40,
    "vatExempt" BOOLEAN NOT NULL DEFAULT false,
    "vatExemptionMention" TEXT,
    "legalMentions" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "webhookEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceSettings_pkey" PRIMARY KEY ("spaceId")
);

CREATE TABLE "DocumentCounter" (
    "spaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("spaceId","kind")
);

ALTER TABLE "SpaceSettings" ADD CONSTRAINT "SpaceSettings_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentCounter" ADD CONSTRAINT "DocumentCounter_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "SpaceSettings" (
    "spaceId", "invoiceNumberFormat", "quoteNumberFormat", "paymentTermsDays",
    "lateFeeRate", "recoveryFeeAmount", "vatExempt", "vatExemptionMention"
)
SELECT
    s."id",
    COALESCE(g."invoiceNumberFormat", 'FAC-{{year}}-{{number}}'),
    COALESCE(g."quoteNumberFormat", 'DEVIS-{{year}}-{{number}}'),
    COALESCE(g."defaultPaymentTermsDays", 30),
    COALESCE(NULLIF(g."defaultLateFeeRate", ''), '3 fois le taux d''intérêt légal en vigueur'),
    COALESCE(g."defaultRecoveryFeeAmount", 40),
    s."platformStudio",
    CASE WHEN s."platformStudio" THEN COALESCE(NULLIF(g."defaultVatExemptionMention", ''), 'TVA non applicable, art. 293 B du CGI') END
FROM "Space" s
LEFT JOIN "Settings" g ON g."id" = 'global';

INSERT INTO "DocumentCounter" ("spaceId", "kind", "next")
SELECT n."spaceId", 'invoice', GREATEST(COALESCE(g."nextInvoiceNumber", 1), 1)
FROM (SELECT DISTINCT "spaceId" FROM "Document" WHERE "invoiceNumber" IS NOT NULL) n
LEFT JOIN "Settings" g ON g."id" = 'global';

INSERT INTO "DocumentCounter" ("spaceId", "kind", "next")
SELECT n."spaceId", 'quote', GREATEST(COALESCE(g."nextQuoteNumber", 1), 1)
FROM (SELECT DISTINCT "spaceId" FROM "Document" WHERE "quoteNumber" IS NOT NULL) n
LEFT JOIN "Settings" g ON g."id" = 'global';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "Document" WHERE "invoiceNumber" IS NOT NULL
        GROUP BY "spaceId", "invoiceNumber" HAVING count(*) > 1
    ) THEN
        RAISE NOTICE 'Document_spaceId_invoiceNumber_key skipped: duplicate invoice numbers exist in a space';
    ELSE
        CREATE UNIQUE INDEX "Document_spaceId_invoiceNumber_key" ON "Document"("spaceId", "invoiceNumber") WHERE "invoiceNumber" IS NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM "Document" WHERE "quoteNumber" IS NOT NULL
        GROUP BY "spaceId", "quoteNumber" HAVING count(*) > 1
    ) THEN
        RAISE NOTICE 'Document_spaceId_quoteNumber_key skipped: duplicate quote numbers exist in a space';
    ELSE
        CREATE UNIQUE INDEX "Document_spaceId_quoteNumber_key" ON "Document"("spaceId", "quoteNumber") WHERE "quoteNumber" IS NOT NULL;
    END IF;
END $$;
