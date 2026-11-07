/**
 * One-off, run after the deploy that introduced pay links: issues a pay link and mails a
 * reminder for every open Stripe payment (pending, overdue, expired or failed) of a
 * platform studio space, skipping any reminded in the last SINCE_DAYS (7), so a rerun is safe.
 * It reports only, until APPLY=1.
 *
 *   DATABASE_URL=... ENCRYPTION_SECRET=... FRONTEND_URL=https://ardoise.facile.studio bun scripts/send-open-payment-links.ts
 *   APPLY=1 DATABASE_URL=... ENCRYPTION_SECRET=... FRONTEND_URL=... bun scripts/send-open-payment-links.ts
 */
import { prisma } from '@repo/database';
import { getSmtpClient } from '@repo/trpc/settings';
import { sendOpenPaymentLinks } from '@repo/trpc/open-payment-links';

const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) throw new Error('FRONTEND_URL is required');

try {
  const apply = process.env.APPLY === '1';
  const result = await sendOpenPaymentLinks(prisma, await getSmtpClient(prisma), frontendUrl, {
    apply,
    sinceDays: Number(process.env.SINCE_DAYS ?? 7),
  });
  console.log(`${apply ? 'sent' : 'would send'}: ${JSON.stringify(result)}`);
} finally {
  await prisma.$disconnect();
}
