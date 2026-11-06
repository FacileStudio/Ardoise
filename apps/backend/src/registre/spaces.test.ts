import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { lockTestDatabase } from '@repo/database/test-lock';
import type { PrismaClient } from '@repo/types';

import { PrismaClient as Client } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { adoptable, applySnapshot, buildImport, splitName } from './spaces';
import { startDirectorySync } from './boot';

/**
 * Run with TEST_DATABASE_URL pointing at a throwaway, fully migrated
 * database: the Apply test truncates User and Space. Without it the DB test
 * skips and says so.
 */
const url = process.env.TEST_DATABASE_URL;
const issuer = 'https://sso.example.test';
const silent = { warn: () => {} };

if (!url) console.warn('[registre/spaces.test] TEST_DATABASE_URL unset: skipping the Apply DB test');

describe('splitName', () => {
  test('splits a display name and falls back to the email', () => {
    expect(splitName('Erin Van Example', 'erin@example.test')).toEqual({ firstName: 'Erin', lastName: 'Van Example' });
    expect(splitName('', 'erin@example.test')).toEqual({ firstName: 'erin', lastName: '' });
  });
});

describe('startDirectorySync', () => {
  test('imports, retrying, before the first sync', async () => {
    const calls: string[] = [];
    let imports = 0;
    const remote = {
      import: async () => {
        calls.push('import');
        if (++imports === 1) throw new Error('registre unreachable');
        return { version: 0, spaces: [] };
      },
      snapshot: async () => {
        calls.push('snapshot');
        return { version: 7, spaces: [] };
      },
    };
    const { syncer, ready } = startDirectorySync({
      remote,
      collect: async () => [],
      apply: async () => void calls.push('apply'),
      logger: silent,
      retry: { initialMs: 1, maxMs: 1, sleep: async () => {} },
    });
    await ready;
    syncer.stop();
    expect(calls).toEqual(['import', 'import', 'snapshot', 'apply']);
  });
});

describe.skipIf(!url)('applySnapshot', () => {
  const db = new Client({
    adapter: new PrismaPg(new pg.Pool({ connectionString: url ?? 'postgresql://unused' })),
  }) as unknown as PrismaClient;
  const ids: Record<string, string> = {};

  let release: () => Promise<void> = async () => {};
  afterAll(() => release());

  beforeAll(async () => {
    release = await lockTestDatabase(url!);
    await db.$executeRawUnsafe('TRUNCATE "User", "Space" CASCADE');
    const user = async (key: string, sub?: string, role: 'MEMBER' | 'CLIENT' = 'MEMBER') => {
      const row = await db.user.create({
        data: { email: `${key}@example.test`, firstName: key, lastName: '', role },
      });
      if (sub) {
        await db.account.create({
          data: { id: crypto.randomUUID(), userId: row.id, providerId: issuer, accountId: sub },
        });
      }
      ids[key] = row.id;
    };
    await user('alice', 'sub-alice');
    await user('bob');
    await user('carol', 'sub-carol');
    await user('dave');
    await user('frank', 'sub-frank-old');
    await user('gina', undefined, 'CLIENT');
    await user('hank');
    const acme = await db.space.create({
      data: {
        name: 'acme',
        members: {
          create: [
            { userId: ids.alice!, role: 'OWNER' },
            { userId: ids.bob!, role: 'MEMBER' },
            { userId: ids.carol!, role: 'MEMBER' },
            { userId: ids.dave!, role: 'MEMBER' },
          ],
        },
      },
    });
    const solo = await db.space.create({
      data: { name: 'Solo', members: { create: [{ userId: ids.carol!, role: 'OWNER' }] } },
    });
    ids.acme = acme.id;
    ids.solo = solo.id;
  }, 600_000);

  test('links by name, provisions members (never ADMIN), maps roles, links emails only when verified, and is idempotent', async () => {
    const payload = await buildImport(db, issuer);
    const acmeImport = payload.find((space) => space.name === 'acme');
    expect(acmeImport?.members).toContainEqual({ sub: 'sub-alice', role: 'owner' });
    expect(acmeImport?.members).toContainEqual({ email: 'bob@example.test', role: 'member' });

    const member = (sub: string, email: string, role: string, name = '', verified?: boolean) => ({
      sub,
      email,
      name,
      picture: '',
      role,
      ...(verified === undefined ? {} : { email_verified: verified }),
    });
    const snapshot = {
      version: 1,
      spaces: [
        {
          id: 'space-1',
          name: 'Acme',
          members: [
            member('sub-alice', 'alice@example.test', 'owner'),
            member('sub-bob', 'BOB@example.test', 'admin', '', true),
            member('sub-erin', 'erin@example.test', 'member', 'Erin Example'),
            member('sub-frank-new', 'frank@example.test', 'member', '', true),
            member('sub-gina', 'gina@example.test', 'member', '', true),
            member('sub-hank', 'hank@example.test', 'member'),
          ],
        },
      ],
    };
    const deps = { db, issuer, logger: silent };
    await applySnapshot(deps, snapshot);

    const acme = await db.space.findUniqueOrThrow({
      where: { id: ids.acme },
      include: { members: { include: { user: true } } },
    });
    expect(acme.registreSpaceId).toBe('space-1');
    expect(acme.name).toBe('Acme');
    const roles = Object.fromEntries(acme.members.map((m) => [m.user.email, m.role]));
    expect(roles).toEqual({
      'alice@example.test': 'OWNER',
      'bob@example.test': 'ADMIN',
      'dave@example.test': 'MEMBER',
      'erin@example.test': 'MEMBER',
    });
    const erin = acme.members.find((m) => m.user.email === 'erin@example.test')!.user;
    expect(erin.firstName).toBe('Erin');
    expect(erin.role).toBe('MEMBER');
    expect(erin.password).toBeNull();
    expect(erin.emailVerified).toBe(false);
    expect(await db.account.count({ where: { accountId: 'sub-gina' } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: ids.gina } })).role).toBe('CLIENT');
    expect(await db.account.count({ where: { accountId: 'sub-hank' } })).toBe(0);
    expect(await db.user.count({ where: { email: { equals: 'hank@example.test', mode: 'insensitive' } } })).toBe(1);
    expect(await db.account.count({ where: { providerId: issuer, accountId: 'sub-bob', userId: ids.bob } })).toBe(1);
    expect(await db.account.count({ where: { accountId: 'sub-frank-new' } })).toBe(0);
    const solo = await db.space.findUniqueOrThrow({ where: { id: ids.solo }, include: { members: true } });
    expect(solo.registreSpaceId).toBeNull();
    expect(solo.members).toHaveLength(1);

    const state = async () => ({
      users: await db.user.count(),
      accounts: await db.account.count(),
      spaces: await db.space.count(),
      memberships: await db.spaceMember.findMany({ orderBy: { id: 'asc' } }),
      acme: (await db.space.findUniqueOrThrow({ where: { id: ids.acme } })).updatedAt,
    });
    const before = await state();
    await applySnapshot(deps, snapshot);
    expect(await state()).toEqual(before);

    await applySnapshot(deps, { version: 2, spaces: [{ id: 'space-1', name: 'Acme', members: [] }] });
    const emptied = await db.spaceMember.findMany({ where: { spaceId: ids.acme }, include: { user: true } });
    expect(emptied.map((m) => m.user.email)).toEqual(['dave@example.test']);
  }, 60_000);

  test('a Registre space named like an unlinked local space never inherits its clients', async () => {
    const local = await db.space.create({
      data: { name: 'Kaktuse', clients: { create: { contactFirstName: 'K', contactLastName: 'K', companyName: 'Kaktuse' } } },
    });
    const stranger = { sub: 'sub-stranger', email: 'x@evil.test', name: 'X', picture: '', role: 'owner' };
    await applySnapshot(
      { db, issuer, logger: silent },
      { version: 3, spaces: [{ id: 'space-evil', name: 'kaktuse', members: [stranger] }] }
    );

    const mirrored = await db.space.findUniqueOrThrow({ where: { registreSpaceId: 'space-evil' }, include: { clients: true } });
    expect(mirrored.id).not.toBe(local.id);
    expect(mirrored.clients).toEqual([]);
    const untouched = await db.space.findUniqueOrThrow({ where: { id: local.id }, include: { clients: true } });
    expect(untouched.registreSpaceId).toBeNull();
    expect(untouched.clients).toHaveLength(1);
    const provisioned = await db.user.findFirstOrThrow({ where: { email: 'x@evil.test' } });
    expect(provisioned.role).toBe('MEMBER');
  }, 60_000);
});

describe('adoptable', () => {
  const owner = (sub: string) => ({ user: { accounts: [{ accountId: sub }] } });
  const remote = (members: Array<[string, string]>) => ({
    id: 'r',
    name: 'n',
    members: members.map(([sub, role]) => ({ sub, role, email: '', name: '', picture: '' })),
  });

  test('adopts only when every identified local owner owns the Registre space', () => {
    expect(adoptable([owner('a')], remote([['a', 'owner']]))).toBe(true);
    expect(adoptable([owner('a')], remote([['a', 'member']]))).toBe(false);
    expect(adoptable([owner('a'), owner('b')], remote([['a', 'owner']]))).toBe(false);
  });

  test('never adopts a space with no identified owner', () => {
    expect(adoptable([], remote([['a', 'owner']]))).toBe(false);
    expect(adoptable([{ user: { accounts: [] } }], remote([['a', 'owner']]))).toBe(false);
  });
});
