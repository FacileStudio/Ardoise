import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import type { EmailSender } from '@repo/smtp';

/**
 * How many emails a space outside the platform studio may send, per rolling
 * hour and day, and how many one member may send across all such spaces per
 * day. Anyone can create Registre spaces, so the per-member cap is what bounds
 * one person.
 */
export const TENANT_EMAIL_LIMITS = { hour: 10, day: 50, memberDay: 50 } as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Who a space's payment emails speak for: the provider named on the linked
 * invoice, else the space itself. Never the platform's company settings.
 */
export async function paymentIssuer(
  db: PrismaClient,
  payment: { spaceId: string; documentId: string | null }
): Promise<{ name: string; bank: { bankName: string | null; iban: string; bic: string | null } | null }> {
  const document = payment.documentId
    ? await db.document.findFirst({
        where: { id: payment.documentId, spaceId: payment.spaceId },
        select: { providerName: true, provider: { select: { spaceId: true, bankName: true, iban: true, bic: true } } },
      })
    : null;
  const space = await db.space.findUnique({ where: { id: payment.spaceId }, select: { name: true } });
  const provider = document?.provider?.spaceId === payment.spaceId ? document.provider : null;
  return {
    name: document?.providerName || space?.name || 'Ardoise',
    bank: provider?.iban ? { bankName: provider.bankName, iban: provider.iban, bic: provider.bic } : null,
  };
}

/**
 * Counts one email against a tenant space's caps and the sending member's,
 * under per-member then per-space locks (always in that order) so concurrent
 * sends cannot both pass the last slot. Refuses with TOO_MANY_REQUESTS once a
 * cap is reached. The ledger keeps no recipient, only the space, the sender,
 * the kind and the time.
 */
export async function reserveTenantEmail(
  db: PrismaClient,
  sender: { spaceId: string; userId: string },
  kind: string,
  now = new Date()
) {
  const { spaceId, userId } = sender;
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ardoise.outbound-email.user:${userId}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ardoise.outbound-email:${spaceId}`}))`;
    const since = (ms: number) => ({ gt: new Date(now.getTime() - ms) });
    const [hour, day, member] = await Promise.all([
      tx.outboundEmail.count({ where: { spaceId, createdAt: since(HOUR_MS) } }),
      tx.outboundEmail.count({ where: { spaceId, createdAt: since(DAY_MS) } }),
      tx.outboundEmail.count({ where: { userId, createdAt: since(DAY_MS) } }),
    ]);
    if (hour >= TENANT_EMAIL_LIMITS.hour || day >= TENANT_EMAIL_LIMITS.day || member >= TENANT_EMAIL_LIMITS.memberDay) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Limite d'envoi atteinte (${TENANT_EMAIL_LIMITS.hour} par heure et ${TENANT_EMAIL_LIMITS.day} par jour pour un espace, ${TENANT_EMAIL_LIMITS.memberDay} par jour pour une personne).`,
      });
    }
    await tx.outboundEmail.create({ data: { spaceId, userId, kind, createdAt: now } });
  });
}

/**
 * The sender of an email a tenant member sends: the issuer's name on the
 * platform's own From address, with replies going to that member's account
 * email. The address part is never taken from user input.
 */
export async function tenantSender(db: PrismaClient, issuer: string, userId: string): Promise<EmailSender> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  return { name: `${issuer} via Ardoise`, ...(user?.email ? { replyTo: user.email } : {}) };
}
