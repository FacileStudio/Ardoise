import { Prisma, type PrismaClient } from '@repo/database';
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
    .replaceAll('{{year}}', String(now.getFullYear()))
    .replaceAll('{{month}}', month)
    .replaceAll('{{number}}', String(number).padStart(3, '0'));
}

const MAX_ATTEMPTS = 20;

const COLUMN = { invoice: 'invoiceNumber', quote: 'quoteNumber' } as const;

async function allocate(tx: Prisma.TransactionClient, spaceId: string, kind: NumberKind) {
  const counter = await tx.documentCounter.upsert({
    where: { spaceId_kind: { spaceId, kind } },
    create: { spaceId, kind, next: 2 },
    update: { next: { increment: 1 } },
  });
  const settings = await getSpaceSettings(tx, spaceId);

  return { sequence: counter.next - 1, number: formatNumber(settings[FORMAT_FIELD[kind]], counter.next - 1) };
}

function isNumberConflict(error: unknown, kind: NumberKind): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  return JSON.stringify(error.meta ?? '').includes(COLUMN[kind]);
}

function escapeRegex(value: string): string {
  return value.replace(/[.^$*+?()[\]{}|\\]/g, '\\$&');
}

function numberPattern(template: string): string {
  const [head = '', tail = ''] = template.split('{{number}}');
  const literal = (part: string) =>
    part
      .split(/(\{\{year\}\}|\{\{month\}\})/)
      .map((piece) => (piece === '{{year}}' ? '[0-9]{4}' : piece === '{{month}}' ? '[0-9]{2}' : escapeRegex(piece)))
      .join('');
  return `^${literal(head)}([0-9]{1,9})${literal(tail)}$`;
}

/**
 * After a number turned out to be taken, moves the counter past it: to one
 * above the highest number of the space that matches the format, and at least
 * one past the number that failed. The move only ever raises the counter, so
 * concurrent callers cannot lower it or skip more than needed.
 */
async function advancePast(db: PrismaClient, spaceId: string, kind: NumberKind, failed: number) {
  const settings = await getSpaceSettings(db, spaceId);
  const pattern = numberPattern(settings[FORMAT_FIELD[kind]]);
  const rows = await db.$queryRawUnsafe<Array<{ max: number | null }>>(
    `SELECT MAX(substring("${COLUMN[kind]}" from $2)::bigint)::int AS max FROM "Document" WHERE "spaceId" = $1 AND "${COLUMN[kind]}" ~ $2`,
    spaceId,
    pattern
  );
  const next = Math.max((rows[0]?.max ?? 0) + 1, failed + 1);
  await db.$executeRaw`INSERT INTO "DocumentCounter" ("spaceId", "kind", "next") VALUES (${spaceId}, ${kind}, ${next})
    ON CONFLICT ("spaceId", "kind") DO UPDATE SET "next" = GREATEST("DocumentCounter"."next", EXCLUDED."next")`;
}

/**
 * Runs `issue` with the next number of a space's sequence, inside the
 * transaction that must also insert the document. The counter row stays
 * locked until that transaction ends, so two requests of one space never get
 * the same number, and a failed insert rolls the counter back: the sequence
 * has no gap and no reuse. A cleanup registered with `onRollback` (a stored
 * PDF) runs when the transaction fails. When the insert hits a number that
 * already exists in the space (a counter that fell behind), the counter is
 * moved past it and the whole transaction runs again, at most 20 times.
 * Use only the `tx` given to `issue` for database work.
 */
export async function withDocumentNumber<T>(
  db: PrismaClient,
  spaceId: string,
  kind: NumberKind,
  issue: (number: string, tx: Prisma.TransactionClient, onRollback: (cleanup: () => Promise<void>) => void) => Promise<T>
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const cleanups: Array<() => Promise<void>> = [];
    let used = 0;
    try {
      return await db.$transaction(async (tx) => {
        const { sequence, number } = await allocate(tx, spaceId, kind);
        used = sequence;
        return issue(number, tx, (cleanup) => void cleanups.push(cleanup));
      }, TRANSACTION);
    } catch (error) {
      await Promise.allSettled(cleanups.map((cleanup) => cleanup()));
      if (attempt >= MAX_ATTEMPTS || !isNumberConflict(error, kind)) throw error;
      await advancePast(db, spaceId, kind, used);
    }
  }
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
