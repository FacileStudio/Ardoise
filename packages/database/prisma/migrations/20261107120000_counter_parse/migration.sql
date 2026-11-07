INSERT INTO "DocumentCounter" ("spaceId", "kind", "next")
SELECT "spaceId", 'invoice', MAX(substring("invoiceNumber" from '([0-9]+)$')::bigint) + 1
FROM "Document"
WHERE "invoiceNumber" ~ '^[A-Za-z]+-[0-9]{4}-[0-9]{1,9}$'
GROUP BY "spaceId"
ON CONFLICT ("spaceId", "kind") DO UPDATE SET "next" = GREATEST("DocumentCounter"."next", EXCLUDED."next");

INSERT INTO "DocumentCounter" ("spaceId", "kind", "next")
SELECT "spaceId", 'quote', MAX(substring("quoteNumber" from '([0-9]+)$')::bigint) + 1
FROM "Document"
WHERE "quoteNumber" ~ '^[A-Za-z]+-[0-9]{4}-[0-9]{1,9}$'
GROUP BY "spaceId"
ON CONFLICT ("spaceId", "kind") DO UPDATE SET "next" = GREATEST("DocumentCounter"."next", EXCLUDED."next");
