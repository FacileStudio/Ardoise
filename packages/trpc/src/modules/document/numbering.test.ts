import { describe, expect, it } from 'bun:test';
import { Prisma } from '@repo/database';
import type { PrismaClient } from '@repo/database';
import { generateNextDocumentNumber } from './numbering';

function settingsDb() {
  const row = { nextInvoiceNumber: 7, invoiceNumberFormat: 'FAC-{{number}}' };
  const db = {
    settings: {
      update: async ({ data }: any) => {
        row.nextInvoiceNumber += data.nextInvoiceNumber.increment;
        return { ...row };
      },
    },
  } as unknown as PrismaClient;
  return db;
}

describe('generateNextDocumentNumber', () => {
  it('hands out consecutive numbers', async () => {
    const db = settingsDb();

    expect(await generateNextDocumentNumber(db, 'invoice')).toBe('FAC-007');
    expect(await generateNextDocumentNumber(db, 'invoice')).toBe('FAC-008');
  });

  it('never gives two concurrent callers the same number', async () => {
    const db = settingsDb();

    const numbers = await Promise.all(
      Array.from({ length: 20 }, () => generateNextDocumentNumber(db, 'invoice'))
    );

    expect(new Set(numbers).size).toBe(20);
  });

  it('reports missing settings', async () => {
    const db = {
      settings: {
        update: async () => {
          throw new Prisma.PrismaClientKnownRequestError('missing', {
            code: 'P2025',
            clientVersion: 'x',
          });
        },
      },
    } as unknown as PrismaClient;

    await expect(generateNextDocumentNumber(db, 'invoice')).rejects.toThrow('Settings not found');
  });
});
