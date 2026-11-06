import { createHash, randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';

export const LINK_TTL_DAYS = 90;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const invalidLink = () =>
  new TRPCError({ code: 'NOT_FOUND', message: 'This payment link is invalid or has expired' });

export async function issuePaymentLink(
  db: PrismaClient,
  paymentId: string,
  frontendUrl: string,
  now = new Date()
): Promise<{ url: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.paymentLink.create({ data: { paymentId, tokenHash: hashToken(token), expiresAt } });
  return { url: `${frontendUrl.replace(/\/$/, '')}/pay/${token}`, expiresAt };
}

export async function resolvePaymentLink(db: PrismaClient, token: string, now = new Date()) {
  if (!TOKEN_PATTERN.test(token)) throw invalidLink();

  const link = await db.paymentLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      payment: {
        include: { client: true, document: { select: { invoiceNumber: true } } },
      },
    },
  });
  if (!link || link.revokedAt || link.expiresAt.getTime() <= now.getTime()) throw invalidLink();

  await db.paymentLink.update({ where: { id: link.id }, data: { lastUsedAt: now } });
  return link.payment;
}

export function revokePaymentLinks(db: PrismaClient, paymentId: string): Promise<{ count: number }> {
  return db.paymentLink.updateMany({
    where: { paymentId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
