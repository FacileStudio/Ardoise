/**
 * Seeds the billing catalog: six features, Solo/Pro/Studio as draft plans and
 * the comped Facile Studio owners. Idempotent: rerunning creates nothing new
 * and never edits rows an admin changed. Reads DATABASE_URL.
 *
 *   mise run billing:seed
 *   DATABASE_URL=... bun scripts/seed-billing.ts
 *
 * The backend runs the same seed at boot when BILLING_SEED_ON_BOOT=true.
 */
import { prisma } from '@repo/database';
import { seedBilling } from '@repo/trpc/billing';

try {
  const result = await seedBilling(prisma);
  console.log(`billing seed: ${JSON.stringify(result)}`);
} finally {
  await prisma.$disconnect();
}
