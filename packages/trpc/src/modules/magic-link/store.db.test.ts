import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { prisma } from '@repo/database';
import { AuthManager } from '@repo/auth';
import type { PrismaClient } from '@repo/types';
import { createPrismaMagicLinkStore } from './store';
import { magicLinkService, type MagicLinkContext } from './service';

const enabled = !!process.env.TEST_DATABASE_URL;
const db = prisma as unknown as PrismaClient;
const auth = new AuthManager({ encryptionSecret: 'x'.repeat(32) });
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const future = () => new Date(Date.now() + 60_000);

const mails: string[] = [];
const ctx: MagicLinkContext = {
  db,
  env: {
    FRONTEND_URL: 'http://app.test',
    MAGIC_LINK_TTL_MINUTES: 15,
    MAGIC_LINK_MAX_PER_EMAIL_HOUR: 5,
    MAGIC_LINK_MAX_PER_IP_HOUR: 20,
  },
  getSmtp: async () => ({ sendEmail: async ({ html }: { html: string }) => void mails.push(html) }) as never,
  log: { info() {}, error() {} } as never,
};

const tokenFromMail = () => mails.at(-1)?.match(/login\/verify\?token=([0-9a-f]{64})/)?.[1] ?? '';
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const makeUser = (id: string, extra: Record<string, unknown> = {}) =>
  prisma.user.create({
    data: { id, email: `${id}@example.test`, firstName: 'F', lastName: 'L', role: 'CLIENT', ...extra },
  });

describe.skipIf(!enabled)('magic links against Postgres', () => {
  beforeEach(async () => {
    mails.length = 0;
    await prisma.magicLink.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('exactly one of two concurrent consumes wins', async () => {
    const store = createPrismaMagicLinkStore(db);
    await makeUser('c1');
    await store.create({ userId: 'c1', tokenHash: hash('t'), expiresAt: future() });

    const results = await Promise.all([store.consume(hash('t'), new Date()), store.consume(hash('t'), new Date())]);

    expect(results.filter((r) => r !== null)).toEqual([{ userId: 'c1' }]);
  });

  test('an expired link is not consumed', async () => {
    const store = createPrismaMagicLinkStore(db);
    await makeUser('c1');
    await store.create({ userId: 'c1', tokenHash: hash('t'), expiresAt: new Date(Date.now() - 1000) });

    expect(await store.consume(hash('t'), new Date())).toBeNull();
  });

  test('a new request supersedes the older link', async () => {
    await makeUser('c1');
    await magicLinkService.request(ctx, 'c1@example.test', '1.1.1.1');
    await settle();
    const first = tokenFromMail();
    await magicLinkService.request(ctx, 'c1@example.test', '1.1.1.1');
    await settle();
    const second = tokenFromMail();

    expect(second).not.toBe(first);
    await expect(magicLinkService.consume(ctx, auth, first)).rejects.toThrow('invalid or has expired');
    const session = await magicLinkService.consume(ctx, auth, second);
    expect(session.user.id).toBe('c1');
    expect(await prisma.session.count({ where: { userId: 'c1' } })).toBe(1);
    const row = await prisma.magicLink.findFirstOrThrow({ where: { tokenHash: hash(second) } });
    expect(row.tokenHash).not.toBe(second);
  });

  test('a client with a leftover password hash still gets a link and no password path', async () => {
    await makeUser('c1', { password: 'stale-hash' });
    await magicLinkService.request(ctx, 'c1@example.test');
    await settle();

    expect(tokenFromMail()).not.toBe('');
  });

  test('admins and blocked clients get no link and no row', async () => {
    await makeUser('a1', { role: 'ADMIN' });
    await makeUser('b1', { isBanned: true });
    await makeUser('s1', { isSuspended: true });
    for (const id of ['a1', 'b1', 's1', 'nobody']) {
      await magicLinkService.request(ctx, `${id}@example.test`);
    }
    await settle();

    expect(mails).toEqual([]);
    expect(await prisma.magicLink.count()).toBe(0);
  });

  test('the per-email cap holds against the real count', async () => {
    await makeUser('c1');
    for (let i = 0; i < 8; i++) await magicLinkService.request(ctx, 'c1@example.test', '2.2.2.2');
    await settle();

    expect(mails).toHaveLength(5);
  });

  test('a link issued before a ban cannot be used afterwards', async () => {
    await makeUser('c1');
    await magicLinkService.request(ctx, 'c1@example.test');
    await settle();
    await prisma.user.update({ where: { id: 'c1' }, data: { isBanned: true } });

    await expect(magicLinkService.consume(ctx, auth, tokenFromMail())).rejects.toThrow('banned');
  });
});
