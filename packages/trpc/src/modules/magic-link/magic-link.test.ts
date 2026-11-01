import { describe, expect, it } from 'bun:test';
import { AuthManager } from '@repo/auth';
import { appRouter } from '../../index';
import { magicLinkService } from './service';

const auth = new AuthManager({ encryptionSecret: 'x'.repeat(32) });

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'CLIENT';
  status: string;
  isBanned: boolean;
  isSuspended: boolean;
  suspendedUntil: Date | null;
  password: string | null;
  avatar: null;
  coverImage: null;
}

interface LinkRow {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  ipAddress?: string;
  createdAt: Date;
}

const baseUser = (overrides: Partial<UserRow>): UserRow => ({
  id: 'u-client',
  email: 'client@example.test',
  firstName: 'C',
  lastName: 'L',
  role: 'CLIENT',
  status: 'ACTIVE',
  isBanned: false,
  isSuspended: false,
  suspendedUntil: null,
  password: null,
  avatar: null,
  coverImage: null,
  ...overrides,
});

function harness(users: UserRow[], limits: { email?: number; ip?: number } = {}) {
  const links: LinkRow[] = [];
  const mails: string[] = [];
  const logs: unknown[] = [];

  const matches = (where: any, u: UserRow) =>
    (!where.email || where.email.equals.toLowerCase() === u.email.toLowerCase()) &&
    (!where.role || where.role === u.role) &&
    (!where.status || where.status === u.status) &&
    (!where.id || where.id === u.id);

  const db = {
    user: {
      findFirst: async ({ where }: any) => users.find((u) => matches(where, u)) ?? null,
      findUnique: async ({ where }: any) => users.find((u) => matches(where, u)) ?? null,
    },
    session: { create: async () => ({}) },
    magicLink: {
      create: async ({ data }: any) => {
        links.push({ ...data, consumedAt: null, createdAt: new Date() });
      },
      updateMany: async ({ where, data }: any) => {
        const hit = links.filter(
          (l) =>
            (!where.userId || l.userId === where.userId) &&
            (!where.tokenHash || l.tokenHash === where.tokenHash) &&
            l.consumedAt === null &&
            (!where.expiresAt || l.expiresAt > where.expiresAt.gt)
        );
        for (const l of hit) l.consumedAt = data.consumedAt;
        return { count: hit.length };
      },
      findUnique: async ({ where }: any) => links.find((l) => l.tokenHash === where.tokenHash) ?? null,
      count: async ({ where }: any) =>
        links.filter(
          (l) =>
            l.createdAt >= where.createdAt.gte &&
            (where.userId === undefined || l.userId === where.userId) &&
            (where.ipAddress === undefined || l.ipAddress === where.ipAddress)
        ).length,
    },
  };

  const ctx = (user: unknown = null, ip = '1.1.1.1') => {
    const resHeaders = new Headers();
    const caller = appRouter.createCaller({
      db,
      auth,
      user,
      resHeaders,
      req: new Request('http://x'),
      ipAddress: ip,
      userAgent: 'test',
      env: {
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://app.test',
        MAGIC_LINK_TTL_MINUTES: 15,
        MAGIC_LINK_MAX_PER_EMAIL_HOUR: limits.email ?? 5,
        MAGIC_LINK_MAX_PER_IP_HOUR: limits.ip ?? 20,
      },
      getSmtp: async () => ({ sendEmail: async ({ html }: { html: string }) => void mails.push(html) }),
      log: { debug() {}, error: (e: unknown) => logs.push(e), info() {}, warn() {} },
    } as any);
    return { caller, resHeaders };
  };

  const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
  const lastToken = () => {
    const match = mails.at(-1)?.match(/login\/verify\?token=([0-9a-f]{64})/);
    return match?.[1] ?? null;
  };

  return { db, ctx, links, mails, logs, settle, lastToken };
}

const asError = (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: Error) => e.message
  );

describe('request timing', () => {
  it('takes at least the floor for a known and an unknown email alike', async () => {
    const h = harness([baseUser({})]);
    const context = {
      db: h.db as any,
      env: { FRONTEND_URL: 'http://app.test', MAGIC_LINK_TTL_MINUTES: 15, MAGIC_LINK_MAX_PER_EMAIL_HOUR: 5, MAGIC_LINK_MAX_PER_IP_HOUR: 20 },
      getSmtp: async () => ({ sendEmail: async () => undefined }) as any,
      log: { error() {}, info() {} } as any,
    };

    for (const email of ['client@example.test', 'nobody@example.test']) {
      const started = performance.now();
      await magicLinkService.request(context, email, '1.1.1.1', 120);
      expect(performance.now() - started).toBeGreaterThanOrEqual(115);
    }
  });
});

describe('magic link mail', () => {
  it('points at the web origin, renders the button, and the token stays out of errors and logs', async () => {
    const h = harness([baseUser({})]);
    await h.ctx().caller.magicLink.request({ email: 'client@example.test' });
    await h.settle();
    const token = h.lastToken()!;

    expect(h.mails[0]).toContain('href="http://app.test/login/verify?token=' + token + '"');
    expect(h.mails[0]).toContain('Me connecter');
    expect(h.mails[0]).toContain('15 minutes');

    const bad = await asError(h.ctx().caller.magicLink.consume({ token: 'e'.repeat(64) }));
    expect(bad).not.toContain('e'.repeat(64));
    expect(JSON.stringify(h.logs)).not.toContain(token);
  });
});

describe('client magic link sign-in', () => {
  it('lets a CLIENT request, consume, and then call a protected procedure', async () => {
    const h = harness([baseUser({})]);

    expect(await h.ctx().caller.magicLink.request({ email: ' Client@Example.test ' })).toEqual({
      ok: true,
    });
    await h.settle();
    const token = h.lastToken();
    expect(token).not.toBeNull();

    const { caller, resHeaders } = h.ctx();
    const { user } = await caller.magicLink.consume({ token: token! });
    expect(user.role as string).toBe('CLIENT');

    const cookies = resHeaders.getSetCookie();
    const access = cookies.find((c) => c.startsWith('auth_token='))!.split(';')[0].split('=')[1];
    const verified = await auth.verifyToken(decodeURIComponent(access));
    expect(verified?.id).toBe('u-client');
    expect(await h.ctx(verified).caller.auth.me({})).toMatchObject({ id: 'u-client' });
  });

  it('spends the link: a second consume fails with the same error as an unknown token', async () => {
    const h = harness([baseUser({})]);
    await h.ctx().caller.magicLink.request({ email: 'client@example.test' });
    await h.settle();
    const token = h.lastToken()!;

    await h.ctx().caller.magicLink.consume({ token });
    const replay = await asError(h.ctx().caller.magicLink.consume({ token }));
    const unknown = await asError(h.ctx().caller.magicLink.consume({ token: 'f'.repeat(64) }));

    expect(replay).toBe('This link is invalid or has expired');
    expect(unknown).toBe(replay);
  });

  it('stores only a hash and never returns it', async () => {
    const h = harness([baseUser({})]);
    const out = await h.ctx().caller.magicLink.request({ email: 'client@example.test' });
    await h.settle();
    const token = h.lastToken()!;

    expect(h.links[0].tokenHash).not.toBe(token);
    expect(JSON.stringify(out)).not.toContain(h.links[0].tokenHash);
    const consumed = await h.ctx().caller.magicLink.consume({ token });
    const json = JSON.stringify(consumed);
    for (const secret of [token, h.links[0].tokenHash, 'tokenHash']) expect(json).not.toContain(secret);
  });

  it('sends nothing to admins, banned, suspended or inactive clients, and answers the same', async () => {
    const people = [
      baseUser({ id: 'a', email: 'admin@example.test', role: 'ADMIN' }),
      baseUser({ id: 'b', email: 'banned@example.test', isBanned: true }),
      baseUser({ id: 's', email: 'suspended@example.test', isSuspended: true }),
      baseUser({ id: 'p', email: 'pending@example.test', status: 'PENDING' }),
    ];
    const h = harness(people);

    for (const email of [...people.map((p) => p.email), 'nobody@example.test']) {
      expect(await h.ctx().caller.magicLink.request({ email })).toEqual({ ok: true });
    }
    await h.settle();

    expect(h.mails).toEqual([]);
    expect(h.links).toEqual([]);
  });

  it('refuses an already issued link once the client is banned or suspended', async () => {
    for (const change of [{ isBanned: true }, { isSuspended: true }] as const) {
      const client = baseUser({});
      const h = harness([client]);
      await h.ctx().caller.magicLink.request({ email: client.email });
      await h.settle();
      Object.assign(client, change);

      const message = await asError(h.ctx().caller.magicLink.consume({ token: h.lastToken()! }));
      expect(message).toMatch(/banned|suspended/);
    }
  });

  it('refuses a link whose owner is not a client', async () => {
    const client = baseUser({});
    const h = harness([client]);
    await h.ctx().caller.magicLink.request({ email: client.email });
    await h.settle();
    client.role = 'ADMIN';

    expect(await asError(h.ctx().caller.magicLink.consume({ token: h.lastToken()! }))).toBe(
      'This link is invalid or has expired'
    );
  });

  it('caps requests per email and per IP', async () => {
    const byEmail = harness([baseUser({})], { email: 2 });
    for (let i = 0; i < 4; i++) await byEmail.ctx().caller.magicLink.request({ email: 'client@example.test' });
    await byEmail.settle();
    expect(byEmail.mails).toHaveLength(2);

    const byIp = harness([baseUser({}), baseUser({ id: 'u2', email: 'two@example.test' })], { ip: 1 });
    await byIp.ctx().caller.magicLink.request({ email: 'client@example.test' });
    await byIp.ctx().caller.magicLink.request({ email: 'two@example.test' });
    await byIp.settle();
    expect(byIp.mails).toHaveLength(1);
  });

  it('keeps the admin welcome link out of the public rate limit', async () => {
    const h = harness([baseUser({})], { email: 1 });
    const context = {
      db: h.db as any,
      env: {
        FRONTEND_URL: 'http://app.test',
        MAGIC_LINK_TTL_MINUTES: 15,
        MAGIC_LINK_MAX_PER_EMAIL_HOUR: 1,
        MAGIC_LINK_MAX_PER_IP_HOUR: 1,
      },
      getSmtp: async () => ({ sendEmail: async ({ html }: { html: string }) => void h.mails.push(html) }) as any,
      log: { error() {}, info() {} } as any,
    };

    await h.ctx().caller.magicLink.request({ email: 'client@example.test' });
    await magicLinkService.sendWelcome(context, 'client@example.test');
    await magicLinkService.sendWelcome(context, 'client@example.test');
    await h.settle();

    expect(h.mails).toHaveLength(3);
    expect(h.mails[2]).toContain('Bienvenue');
  });
});
