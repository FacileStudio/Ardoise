import { afterAll, beforeAll, beforeEach, describe, expect, it, setDefaultTimeout } from 'bun:test';
import { Prisma, prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { formatNumber, previewDocumentNumber, withDocumentNumber } from './numbering';

describe('formatNumber', () => {
  it('fills year, month and a zero-padded number', () => {
    const now = new Date(2026, 10, 6);
    expect(formatNumber('FAC-{{year}}-{{month}}-{{number}}', 7, now)).toBe('FAC-2026-11-007');
    expect(formatNumber('F{{number}}', 1234, now)).toBe('F1234');
    expect(formatNumber('{{year}}/{{year}}-{{number}}', 1, now)).toBe('2026/2026-001');
  });
});

setDefaultTimeout(30_000);

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('per-space document numbering against Postgres', () => {
  let release: () => Promise<void> = async () => {};
  let spaceA = '';
  let spaceB = '';

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
  }, 60_000);

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Space" CASCADE');
    await release();
  }, 60_000);

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Space" CASCADE');
    spaceA = (await prisma.space.create({ data: { name: 'A' } })).id;
    spaceB = (await prisma.space.create({ data: { name: 'B' } })).id;
  });

  const issue = (spaceId: string, kind: 'invoice' | 'quote') =>
    withDocumentNumber(prisma, spaceId, kind, async (number) => number);

  it('counts per space and per type, from the French defaults', async () => {
    expect(await issue(spaceA, 'invoice')).toMatch(/^FAC-\d{4}-001$/);
    expect(await issue(spaceA, 'invoice')).toMatch(/^FAC-\d{4}-002$/);
    expect(await issue(spaceB, 'invoice')).toMatch(/^FAC-\d{4}-001$/);
    expect(await issue(spaceA, 'quote')).toMatch(/^DEVIS-\d{4}-001$/);
  });

  it('hands 25 concurrent callers 25 distinct consecutive numbers', async () => {
    const numbers = await Promise.all(Array.from({ length: 25 }, () => issue(spaceA, 'invoice')));
    const sequence = numbers.map((number) => Number(number.slice(-3))).sort((a, b) => a - b);

    expect(sequence).toEqual(Array.from({ length: 25 }, (_, index) => index + 1));
  }, 60_000);

  it('gives the number back when the document insert fails, so there is no gap', async () => {
    expect(await issue(spaceA, 'invoice')).toMatch(/-001$/);

    await expect(
      withDocumentNumber(prisma, spaceA, 'invoice', async (number) => {
        expect(number).toMatch(/-002$/);
        throw new Error('insert failed');
      })
    ).rejects.toThrow('insert failed');

    expect(await issue(spaceA, 'invoice')).toMatch(/-002$/);
  });

  it('serialises a failing and a succeeding caller without reusing or skipping', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        withDocumentNumber(prisma, spaceA, 'invoice', async (number) => {
          if (index % 3 === 0) throw new Error('rolled back');
          return number;
        })
      )
    );
    const issued = results.flatMap((result) => (result.status === 'fulfilled' ? [Number(result.value.slice(-3))] : []));

    expect(issued.sort((a, b) => a - b)).toEqual(Array.from({ length: issued.length }, (_, index) => index + 1));
  }, 60_000);

  it('uses the space format and previews without consuming', async () => {
    await prisma.spaceSettings.create({ data: { spaceId: spaceA, invoiceNumberFormat: 'A/{{number}}' } });

    expect(await previewDocumentNumber(prisma, spaceA, 'invoice')).toBe('A/001');
    expect(await previewDocumentNumber(prisma, spaceA, 'invoice')).toBe('A/001');
    expect(await issue(spaceA, 'invoice')).toBe('A/001');
    expect(await previewDocumentNumber(prisma, spaceA, 'invoice')).toBe('A/002');
    expect(await previewDocumentNumber(prisma, spaceB, 'invoice')).toMatch(/^FAC-\d{4}-001$/);
  });

  it('refuses a space that does not exist instead of creating a counter', async () => {
    await expect(issue('missing-space', 'invoice')).rejects.toThrow();
    expect(await prisma.documentCounter.count({ where: { spaceId: 'missing-space' } })).toBe(0);
  });
});

describe.skipIf(!enabled)('a counter that fell behind', () => {
  let release: () => Promise<void> = async () => {};
  let spaceId = '';
  let userId = '';

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
  }, 60_000);

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "User", "Space" CASCADE');
    await release();
  }, 60_000);

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "User", "Space" CASCADE');
    userId = (await prisma.user.create({ data: { email: 'n@x.test', firstName: 'n', lastName: 'n', role: 'MEMBER' } })).id;
    spaceId = (await prisma.space.create({ data: { name: 'N' } })).id;
  });

  const insert = (tx: Prisma.TransactionClient, number: string) =>
    tx.document.create({
      data: {
        type: 'facture_prestation',
        name: `${number}.pdf`,
        invoiceNumber: number,
        clientName: 'c',
        providerName: 'p',
        items: [],
        subtotal: 1,
        tva: 0,
        total: 1,
        createdBy: userId,
        spaceId,
      },
    });

  const year = new Date().getFullYear();

  it('moves past the numbers that exist and issues the next free one', async () => {
    for (const n of ['001', '002', '007']) {
      await prisma.document.create({
        data: {
          type: 'facture_prestation', name: 'x', invoiceNumber: `FAC-${year}-${n}`, clientName: 'c', providerName: 'p',
          items: [], subtotal: 1, tva: 0, total: 1, createdBy: userId, spaceId,
        },
      });
    }
    let calls = 0;

    const number = await withDocumentNumber(prisma, spaceId, 'invoice', async (candidate, tx) => {
      calls += 1;
      await insert(tx, candidate);
      return candidate;
    });

    expect(number).toBe(`FAC-${year}-008`);
    expect(calls).toBe(2);
    expect(await previewDocumentNumber(prisma, spaceId, 'invoice')).toBe(`FAC-${year}-009`);
  });

  it('runs a cleanup registered by each failed attempt', async () => {
    await prisma.document.create({
      data: {
        type: 'facture_prestation', name: 'x', invoiceNumber: `FAC-${year}-001`, clientName: 'c', providerName: 'p',
        items: [], subtotal: 1, tva: 0, total: 1, createdBy: userId, spaceId,
      },
    });
    const removed: string[] = [];

    await withDocumentNumber(prisma, spaceId, 'invoice', async (candidate, tx, onRollback) => {
      onRollback(async () => void removed.push(candidate));
      await insert(tx, candidate);
    });

    expect(removed).toEqual([`FAC-${year}-001`]);
  });

  it('gives up after a bounded number of attempts when every number is taken', async () => {
    let calls = 0;

    await expect(
      withDocumentNumber(prisma, spaceId, 'invoice', async (_candidate, tx) => {
        calls += 1;
        await insert(tx, 'ALWAYS-TAKEN');
        await insert(tx, 'ALWAYS-TAKEN');
      })
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(calls).toBe(20);
  }, 60_000);

  it('does not retry a failure that is not a number conflict', async () => {
    let calls = 0;

    await expect(
      withDocumentNumber(prisma, spaceId, 'invoice', async () => {
        calls += 1;
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(calls).toBe(1);
  });
});

describe.skipIf(!enabled)('stored files of a failed document', () => {
  let release: () => Promise<void> = async () => {};

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await prisma.$executeRawUnsafe('TRUNCATE "Space" CASCADE');
  }, 60_000);

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Space" CASCADE');
    await release();
  }, 60_000);

  it('runs the registered cleanups when the insert fails, and not when it succeeds', async () => {
    const space = await prisma.space.create({ data: { name: 'C' } });
    const removed: string[] = [];

    await expect(
      withDocumentNumber(prisma, space.id, 'invoice', async (_number, _tx, onRollback) => {
        onRollback(async () => void removed.push('blob-1'));
        throw new Error('insert failed');
      })
    ).rejects.toThrow('insert failed');
    expect(removed).toEqual(['blob-1']);

    await withDocumentNumber(prisma, space.id, 'invoice', async (_number, _tx, onRollback) => {
      onRollback(async () => void removed.push('blob-2'));
    });
    expect(removed).toEqual(['blob-1']);
  });
});
