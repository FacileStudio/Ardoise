import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import type { PrismaClient } from '@repo/database';
import { AdminEngine } from './engine';
import type { EntityConfig } from './types';

const config: EntityConfig = {
  name: 'user',
  displayName: 'User',
  schema: { create: z.record(z.unknown()), update: z.record(z.unknown()) },
  fields: [],
  listFields: ['email'],
  hiddenFields: ['password'],
};

const stored = { id: 'u1', email: 'a@b.fr', password: 'argon2-hash' };

function setup() {
  const audits: any[] = [];
  const writes: any[] = [];
  const delegate = {
    findMany: async () => [{ ...stored }],
    count: async () => 1,
    findUnique: async () => ({ ...stored }),
    create: async ({ data }: any) => {
      writes.push(data);
      return { ...stored, ...data };
    },
    update: async ({ data }: any) => {
      writes.push(data);
      return { ...stored, ...data };
    },
    delete: async () => stored,
  };
  const db = {
    auditLog: { create: async ({ data }: any) => audits.push(data) },
  } as unknown as PrismaClient;
  const engine = new AdminEngine(db, config, delegate);
  const context = { userId: 'admin', role: 'ADMIN' };
  return { engine, context, audits, writes };
}

describe('AdminEngine hidden fields', () => {
  it('strips hidden fields from list and get results', async () => {
    const { engine, context } = setup();

    const list = await engine.list(context);
    const one = await engine.get(context, 'u1');

    expect(list.data[0]).not.toHaveProperty('password');
    expect(one).not.toHaveProperty('password');
  });

  it('ignores a hidden field sent by the caller', async () => {
    const { engine, context, writes } = setup();

    const created = await engine.create(context, { email: 'x@y.fr', password: 'plain' });
    await engine.update(context, 'u1', { password: 'plain' });

    expect(writes.every((data) => !('password' in data))).toBe(true);
    expect(created).not.toHaveProperty('password');
  });

  it('keeps hidden fields out of the audit trail', async () => {
    const { engine, context, audits } = setup();

    await engine.update(context, 'u1', { email: 'new@y.fr' });
    await engine.delete(context, 'u1');

    expect(JSON.stringify(audits)).not.toContain('argon2-hash');
  });
});
