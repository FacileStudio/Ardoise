DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Settings'
      AND column_name = 'invoiceNumberFormat'
  ) THEN
    INSERT INTO "Settings" (
      id,
      "companyName",
      "invoiceNumberFormat",
      "quoteNumberFormat",
      "contractNumberFormat",
      "nextInvoiceNumber",
      "nextQuoteNumber",
      "nextContractNumber",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      'global',
      'Facile Studio',
      'FAC-{{year}}-{{number}}',
      'DEVIS-{{year}}-{{number}}',
      'CONT-{{year}}-{{number}}',
      1,
      1,
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE "Settings"
    SET
      "invoiceNumberFormat" = COALESCE("invoiceNumberFormat", 'FAC-{{year}}-{{number}}'),
      "quoteNumberFormat" = COALESCE("quoteNumberFormat", 'DEVIS-{{year}}-{{number}}'),
      "contractNumberFormat" = COALESCE("contractNumberFormat", 'CONT-{{year}}-{{number}}'),
      "updatedAt" = NOW()
    WHERE
      "invoiceNumberFormat" IS NULL
      OR "quoteNumberFormat" IS NULL
      OR "contractNumberFormat" IS NULL;
  END IF;
END $$;
