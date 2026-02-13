# Database Migrations

Manual SQL migrations for production deployments.

## How to Apply Migrations

### Local Development
The schema is already synced via `just push` or `bun run db:push`.

### Production (Railway/Other)
Apply migrations manually using psql:

```bash
psql $DATABASE_URL -f add_payment_documents.sql
```

Or via Railway CLI:
```bash
railway run psql $DATABASE_URL -f add_payment_documents.sql
```

## Available Migrations

### add_payment_documents.sql
Adds the `PaymentDocument` junction table for attaching documents to payments.

- Creates `PaymentDocument` table
- Adds unique constraint on (paymentId, documentId)
- Creates indexes for performance
- Adds foreign keys with cascade delete

**Note:** This migration is idempotent and safe to run multiple times.
