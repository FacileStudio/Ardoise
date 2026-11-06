import type { Prisma, PrismaClient } from '@repo/database';
import { getSpaceSettings } from '../space/settings';

export type NumberKind = 'invoice' | 'quote';

const FORMAT_FIELD = {
  invoice: 'invoiceNumberFormat',
  quote: 'quoteNumberFormat',
} as const;

const TRANSACTION = { maxWait: 10_000, timeout: 60_000 } as const;

export function formatNumber(template: string, number: number, now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return template
    .replace('{{year}}', String(now.getFullYear()))
    .replace('{{month}}', month)
    .replace('{{number}}', String(number).padStart(3, '0'));
}

async function allocate(tx: Prisma.TransactionClient, spaceId: string, kind: NumberKind) {
  const counter = await tx.documentCounter.upsert({
    where: { spaceId_kind: { spaceId, kind } },
    create: { spaceId, kind, next: 2 },
    update: { next: { increment: 1 } },
  });
  const settings = await getSpaceSettings(tx, spaceId);

  return formatNumber(settings[FORMAT_FIELD[kind]], counter.next - 1);
}

/**
 * Runs `issue` with the next number of a space's sequence, inside the
 * transaction that must also insert the document. The counter row stays
 * locked until that transaction ends, so two requests of one space never get
 * the same number, and a failed insert rolls the counter back: the sequence
 * has no gap and no reuse. Use only the `tx` given to `issue` for database
 * work.
 */
export function withDocumentNumber<T>(
  db: PrismaClient,
  spaceId: string,
  kind: NumberKind,
  issue: (number: string, tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => issue(await allocate(tx, spaceId, kind), tx), TRANSACTION);
}

export async function previewDocumentNumber(
  db: PrismaClient,
  spaceId: string,
  kind: NumberKind
): Promise<string> {
  const counter = await db.documentCounter.findUnique({
    where: { spaceId_kind: { spaceId, kind } },
    select: { next: true },
  });
  const settings = await getSpaceSettings(db, spaceId);

  return formatNumber(settings[FORMAT_FIELD[kind]], counter?.next ?? 1);
}
