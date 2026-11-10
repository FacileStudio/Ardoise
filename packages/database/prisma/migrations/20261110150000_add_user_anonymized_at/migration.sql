-- An erased person's account stays as a tombstone so the invoices, quotes and
-- contracts it issued keep a valid "createdBy". This is when it was anonymised.
ALTER TABLE "User" ADD COLUMN "anonymizedAt" TIMESTAMP(3);
