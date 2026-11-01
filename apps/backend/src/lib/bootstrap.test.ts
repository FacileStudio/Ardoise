import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import type { PrismaClient } from '@repo/types';
import type { ServerEnv } from '@repo/env';

import { PrismaClient as Client } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const url = process.env.TEST_DATABASE_URL;
const prisma = new Client({
  adapter: new PrismaPg(new pg.Pool({ connectionString: url ?? 'postgresql://unused' })),
});

const { AuthManager } = await import('@repo/auth');
const { bootstrapAdmin, UNUSABLE_PASSWORD } = await import('./bootstrap');
const { resolveUser } = await import('../oidc/identity');
const { default: authService } = await import('@repo/trpc/auth/service');

const db = prisma as unknown as PrismaClient;
const auth = new AuthManager({ encryptionSecret: 'x'.repeat(32) });
const ISSUER = 'https://sso.example.test';

const envFor = (extra: Partial<ServerEnv>) =>
  ({
    ADMIN_EMAIL: 'owner@example.test',
    ADMIN_PASSWORD: undefined,
    ADMIN_MIGRATE_FROM: 'admin@example.test',
    SSO_ONLY: true,
    ...extra,
  }) as ServerEnv;

const seed = async (email: string, role: 'ADMIN' | 'CLIENT' = 'ADMIN', password = 'legacy-hash') =>
  prisma.user.create({
    data: { email, firstName: 'F', lastName: 'L', password, role, emailVerified: true },
  });

const addSession = (userId: string) =>
  prisma.session.create({
    data: { id: crypto.randomUUID(), userId, token: crypto.randomUUID(), expiresAt: new Date(Date.now() + 1e6) },
  });

describe.skipIf(!url)('bootstrapAdmin', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('rename path keeps the id, clears sessions and linked accounts survive', async () => {
    const legacy = await seed('admin@example.test');
    await addSession(legacy.id);
    await prisma.account.create({
      data: { id: 'acc-1', userId: legacy.id, providerId: 'oidc', accountId: 'old' },
    });
    const bystander = await seed('other@example.test', 'ADMIN', 'keep-me');

    await bootstrapAdmin(envFor({}), auth, db);

    const moved = await prisma.user.findUniqueOrThrow({ where: { id: legacy.id } });
    expect(moved.email).toBe('owner@example.test');
    expect(moved.password).toBe(UNUSABLE_PASSWORD);
    expect(await prisma.session.count({ where: { userId: legacy.id } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: legacy.id } })).toBe(1);
    expect(await prisma.user.count()).toBe(2);

    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: bystander.id } });
    expect(untouched.password).toBe('keep-me');
  });

  test('both-exist path disables the legacy admin and keeps its row', async () => {
    const legacy = await seed('admin@example.test');
    await addSession(legacy.id);
    const target = await seed('owner@example.test', 'ADMIN', 'target-hash');

    await bootstrapAdmin(envFor({}), auth, db);

    const disabled = await prisma.user.findUniqueOrThrow({ where: { id: legacy.id } });
    expect(disabled.isBanned).toBe(true);
    expect(disabled.status).toBe('BANNED');
    expect(disabled.password).toBe(UNUSABLE_PASSWORD);
    expect(await prisma.session.count({ where: { userId: legacy.id } })).toBe(0);

    const admin = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(admin.role).toBe('ADMIN');
    expect(admin.isBanned).toBe(false);
    expect(admin.password).toBe(UNUSABLE_PASSWORD);
  });

  test('creates the admin without a password when nothing exists', async () => {
    await bootstrapAdmin(envFor({ ADMIN_MIGRATE_FROM: undefined }), auth, db);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@example.test' } });
    expect(admin).toMatchObject({ role: 'ADMIN', status: 'ACTIVE', emailVerified: true });
    expect(admin.password).toBe(UNUSABLE_PASSWORD);
  });

  test('is idempotent', async () => {
    await seed('admin@example.test');
    await seed('client@example.test', 'CLIENT', 'client-hash');
    await bootstrapAdmin(envFor({}), auth, db);
    const first = await prisma.user.findMany({ orderBy: { email: 'asc' } });
    await bootstrapAdmin(envFor({}), auth, db);
    expect(await prisma.user.findMany({ orderBy: { email: 'asc' } })).toEqual(first);
  });

  test('never touches users other than the admin and the legacy one', async () => {
    const banned = await prisma.user.create({
      data: { email: 'banned@example.test', firstName: 'B', lastName: 'B', password: 'h', role: 'ADMIN', isBanned: true, status: 'BANNED' },
    });
    await bootstrapAdmin(envFor({}), auth, db);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: banned.id } });
    expect(after).toEqual(banned);
  });

  test('without SSO_ONLY the password is applied as before', async () => {
    await seed('owner@example.test', 'CLIENT', 'old');
    await bootstrapAdmin(
      envFor({ SSO_ONLY: false, ADMIN_PASSWORD: 'a-real-password' }),
      auth,
      db
    );
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@example.test' } });
    expect(admin.role).toBe('ADMIN');
    expect(await auth.verifyPassword('a-real-password', admin.password ?? '')).toBe(true);
  });

  test('without SSO_ONLY ADMIN_MIGRATE_FROM is ignored', async () => {
    const legacy = await seed('admin@example.test');
    await bootstrapAdmin(envFor({ SSO_ONLY: false, ADMIN_PASSWORD: 'a-real-password' }), auth, db);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: legacy.id } });
    expect(row.email).toBe('admin@example.test');
  });

  test('the migrated admin cannot use password login', async () => {
    await seed('admin@example.test', 'ADMIN', await auth.hashPassword('old-password'));
    await bootstrapAdmin(envFor({}), auth, db);
    for (const email of ['owner@example.test', 'admin@example.test']) {
      const result = await authService
        .login(db, auth, { email, password: 'old-password' }, undefined, { ssoOnly: true })
        .then(() => 'ok', (e: Error) => e.message);
      expect(result).toBe('Invalid credentials');
    }
  });

  test('an SSO identity for the new email resolves to the migrated user and links', async () => {
    const legacy = await seed('admin@example.test');
    await bootstrapAdmin(envFor({ ADMIN_EMAIL: 'yann@facile.studio' }), auth, db);

    const session = await resolveUser(db, ISSUER, {
      sub: 'sub-yann',
      email: 'Yann@Facile.Studio',
      emailVerified: true,
    });
    expect(session.id).toBe(legacy.id);
    expect(String(session.role)).toBe('ADMIN');
    expect(await prisma.account.count({ where: { userId: legacy.id, providerId: ISSUER } })).toBe(1);
  });
});
