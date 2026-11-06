CREATE TABLE "SpaceSettings" (
    "spaceId" TEXT NOT NULL,
    "invoiceNumberFormat" TEXT NOT NULL DEFAULT 'FAC-{{year}}-{{number}}',
    "quoteNumberFormat" TEXT NOT NULL DEFAULT 'DEVIS-{{year}}-{{number}}',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "lateFeeRate" TEXT NOT NULL DEFAULT '3 fois le taux d''intérêt légal en vigueur',
    "recoveryFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 40,
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
    "lateFeeRate", "recoveryFeeAmount", "vatExemptionMention"
)
SELECT
    s."id",
    COALESCE(g."invoiceNumberFormat", 'FAC-{{year}}-{{number}}'),
    COALESCE(g."quoteNumberFormat", 'DEVIS-{{year}}-{{number}}'),
    COALESCE(g."defaultPaymentTermsDays", 30),
    COALESCE(NULLIF(g."defaultLateFeeRate", ''), '3 fois le taux d''intérêt légal en vigueur'),
    COALESCE(g."defaultRecoveryFeeAmount", 40),
    NULLIF(g."defaultVatExemptionMention", '')
FROM "Space" s
LEFT JOIN "Settings" g ON g."id" = 'global';

INSERT INTO "DocumentCounter" ("spaceId", "kind", "next")
SELECT "spaceId", 'invoice', MAX(substring("invoiceNumber" from '([0-9]+)$')::bigint) + 1
FROM "Document"
WHERE "source" = 'generated'
  AND "invoiceNumber" ~ '(^|[^0-9])[0-9]{1,9}$'
GROUP BY "spaceId";

INSERT INTO "DocumentCounter" ("spaceId", "kind", "next")
SELECT "spaceId", 'quote', MAX(substring("quoteNumber" from '([0-9]+)$')::bigint) + 1
FROM "Document"
WHERE "source" = 'generated'
  AND "quoteNumber" ~ '(^|[^0-9])[0-9]{1,9}$'
GROUP BY "spaceId";
