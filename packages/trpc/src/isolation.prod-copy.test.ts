import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { prisma } from '@repo/database';
import { appRouter } from './index';
import { ensureFirstSpace } from './modules/space/first-space';
import { inputFor, paths } from './testing/access-map';

/**
 * Space isolation on a restored copy of production. Set PROD_COPY_DATABASE_URL
 * (and DATABASE_URL to the same value) to a local throwaway database restored
 * from a pg_dump; the suite refuses any other host. It never truncates: it adds
 * one brand-new account, then sweeps every space-scoped procedure, as that
 * newcomer and as every real member, against the real rows of every space
 * they do not belong to. Every table must hash the same before and after, no
 * platform mail, Stripe or HTTP call may happen, and no foreign id may come
 * back. Failures name the procedure and a short hash, never customer data.
 */

const url = process.env.PROD_COPY_DATABASE_URL;
const local = (value: string) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname);
if (url && (!local(url) || process.env.DATABASE_URL !== url)) {
  throw new Error('PROD_COPY_DATABASE_URL must be a local database and equal DATABASE_URL');
}

const sends: string[] = [];
const realFetch = globalThis.fetch;
const silent = { debug() {}, error() {}, info() {}, warn() {}, child() { return silent; } };
const short = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 10);
function recordingStripe(path: string[] = []): unknown {
  return new Proxy(() => {}, {
    get: (_target, key) => (key === 'then' ? undefined : recordingStripe([...path, String(key)])),
    apply: async () => {
      sends.push(`stripe:${path.join('.')}`);
      return { id: 'stripe_fake', url: 'https://stripe.test', client_secret: 'secret' };
    },
  });
}
const untouchable = new Proxy(
  {},
  {
    get: (_target, key) =>
      key === 'then'
        ? undefined
        : () => {
            throw new Error('must not be reached');
          },
  }
);

function callerFor(user: { id: string; email: string }) {
  const caller = appRouter.createCaller({
    req: new Request('http://api.test'),
    resHeaders: new Headers(),
    user: { ...user, role: 'MEMBER' },
    db: prisma,
    auth: untouchable,
    storage: untouchable,
    getStripe: async () => recordingStripe(),
    getSmtp: async () => ({ sendEmail: async () => void sends.push('mail') }),
    env: {
      OIDC_ISSUER: 'https://sso.prod-copy.test',
      PLUME_URL: 'https://plume.test',
      PLUME_API_TOKEN: 'prod-copy-token',
      PLUME_WEBHOOK_SECRET: 'prod-copy-webhook-secret',
      ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET ?? 'prod-copy-encryption-secret-0123456789',
      FRONTEND_URL: 'http://app.test',
      BACKEND_URL: 'http://api.test',
    },
    apiOrigin: 'http://api.test',
    appOrigin: 'http://app.test',
    ipAddress: '203.0.113.20',
    userAgent: 'prod-copy-test',
    log: silent,
  } as never);
  return (path: string, input?: unknown) =>
    (path.split('.').reduce((node: any, key) => node[key], caller) as (input?: unknown) => Promise<unknown>)(input);
}

type Target = { spaceId: string; ids: Record<string, string | undefined>; secrets: string[] };

describe.skipIf(!url)('space isolation on a restored production copy', () => {
  const original = { spaces: [] as string[], users: [] as string[] };
  const targets: Target[] = [];
  const members = new Map<string, Set<string>>();
  let tables: string[] = [];
  let newcomer: { id: string; email: string };

  async function fingerprint(): Promise<string> {
    const parts: string[] = [];
    for (const table of tables) {
      const filter =
        table === 'Space' || table === 'SpaceMember' || table === 'User'
          ? `WHERE "${table === 'SpaceMember' ? 'spaceId' : 'id'}" = ANY($1::text[])`
          : '';
      const values = table === 'User' ? original.users : original.spaces;
      const rows = await prisma.$queryRawUnsafe<Array<{ h: string | null }>>(
        `SELECT md5(coalesce(string_agg(md5(t::text), '' ORDER BY md5(t::text)), '')) AS h FROM "${table}" t ${filter}`,
        ...(filter ? [values] : [])
      );
      parts.push(`${table}:${rows[0]?.h}`);
    }
    return parts.join('|');
  }

  beforeAll(async () => {
    globalThis.fetch = (async (input: string | URL | Request) => {
      sends.push(`http:${short(String(input instanceof Request ? input.url : input))}`);
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    const listed = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE' AND table_name NOT IN ('_prisma_migrations', 'AuditLog', 'Session', 'Account', 'OutboundEmail', 'MagicLink')`
    );
    tables = listed.map((row) => row.name).sort();
    original.spaces = (await prisma.space.findMany({ select: { id: true } })).map((s) => s.id);
    original.users = (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id);
    for (const m of await prisma.spaceMember.findMany({ select: { userId: true, spaceId: true } })) {
      members.set(m.userId, (members.get(m.userId) ?? new Set()).add(m.spaceId));
    }
    for (const spaceId of original.spaces) {
      const [clients, missions, documents, payments, providers, member] = await Promise.all([
        prisma.client.findMany({ where: { spaceId }, select: { id: true, companyName: true } }),
        prisma.mission.findMany({ where: { spaceId }, select: { id: true } }),
        prisma.document.findMany({ where: { spaceId }, select: { id: true } }),
        prisma.payment.findMany({ where: { spaceId }, select: { id: true } }),
        prisma.provider.findMany({ where: { spaceId }, select: { id: true, iban: true } }),
        prisma.spaceMember.findFirst({ where: { spaceId }, select: { userId: true } }),
      ]);
      if (clients.length + missions.length + documents.length + payments.length === 0) continue;
      targets.push({
        spaceId,
        ids: {
          spaceB: spaceId,
          clientB: clients[0]?.id,
          missionB: missions[0]?.id,
          documentB: documents[0]?.id,
          paymentB: payments[0]?.id,
          providerB: providers[0]?.id,
          bob: member?.userId,
          alice: member?.userId,
        },
        secrets: [
          ...[clients, missions, documents, payments, providers].flat().map((row) => row.id),
          ...clients.map((c) => c.companyName).filter((name) => name && name.length >= 4),
          ...providers.map((p) => p.iban ?? '').filter((iban) => iban.length >= 8),
        ],
      });
    }
    const fresh = await prisma.user.create({
      data: {
        email: `newcomer-${crypto.randomUUID()}@prod-copy.test`,
        firstName: 'Prod',
        lastName: 'Copy Newcomer',
        role: 'MEMBER',
        emailVerified: true,
      },
    });
    await ensureFirstSpace(prisma, fresh);
    newcomer = fresh;
  }, 600_000);

  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  it('restored real data to sweep', () => {
    expect(targets.length).toBeGreaterThan(0);
    console.log(`[prod-copy] ${original.spaces.length} spaces, ${original.users.length} users, ${targets.length} spaces with data, ${tables.length} tables hashed`);
  });

  it('gives the brand-new account one empty space that lists nothing real', async () => {
    const call = callerFor(newcomer);
    const spaces = (await call('space.list')) as Array<{ id: string }>;
    expect(spaces).toHaveLength(1);
    expect(original.spaces).not.toContain(spaces[0]!.id);
    const seen = JSON.stringify(
      await Promise.all(
        ['client.list', 'mission.list', 'document.list', 'payment.list', 'provider.list', 'revenue.overview'].map((p) =>
          call(p, {})
        )
      )
    );
    const leaked = targets.flatMap((t) => t.secrets).filter((secret) => seen.includes(secret));
    expect(leaked.map(short)).toEqual([]);
  });

  it('lets no real member list rows of a space they are not in', async () => {
    const leaks: string[] = [];
    for (const [userId, own] of members) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
      if (!user || user.role === 'CLIENT') continue;
      const foreign = targets.filter((t) => !own.has(t.spaceId)).flatMap((t) => t.secrets.filter((s) => s.length >= 20));
      const seen = JSON.stringify(
        await Promise.all(
          ['client.list', 'mission.list', 'document.list', 'payment.list'].map((p) => callerFor(user)(p, {}))
        )
      );
      const leaked = foreign.filter((secret) => seen.includes(secret));
      if (leaked.length > 0) leaks.push(`${short(userId)}: ${leaked.map(short).join(',')}`);
    }
    expect(leaks).toEqual([]);
  }, 600_000);

  it('refuses every space-scoped procedure across spaces, for the newcomer and every real member', async () => {
    const attackers: Array<{ id: string; email: string; own: Set<string> }> = [{ ...newcomer, own: new Set() }];
    for (const [userId, own] of members) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
      if (user && user.role !== 'CLIENT') attackers.push({ id: user.id, email: user.email, own });
    }
    const leaks: string[] = [];
    let calls = 0;
    for (const attacker of attackers) {
      const call = callerFor(attacker);
      for (const target of targets.filter((t) => !attacker.own.has(t.spaceId))) {
        const before = await fingerprint();
        for (const path of paths('space-scoped')) {
          sends.splice(0);
          calls += 1;
          let code = 'OK';
          let output: unknown;
          try {
            output = await call(path, inputFor(target.ids, path));
          } catch (error) {
            code = error instanceof TRPCError ? error.code : 'THROWN';
          }
          const where = `${path} by ${short(attacker.id)} on ${short(target.spaceId)}`;
          if (code === 'OK') {
            const json = JSON.stringify(output) ?? '';
            const seen = target.secrets.filter((secret) => json.includes(secret));
            if (seen.length > 0) leaks.push(`${where}: returned ${seen.length} foreign values`);
          } else if (!['FORBIDDEN', 'NOT_FOUND', 'BAD_REQUEST'].includes(code)) {
            leaks.push(`${where}: ${code}`);
          }
          if (sends.length > 0) leaks.push(`${where}: spent ${sends.join(',')}`);
        }
        if ((await fingerprint()) !== before) leaks.push(`data changed by ${short(attacker.id)} on ${short(target.spaceId)}`);
      }
    }
    console.log(`[prod-copy] ${attackers.length} attackers, ${calls} cross-space calls, ${leaks.length} leaks`);
    expect(leaks).toEqual([]);
  }, 3_600_000);
});
