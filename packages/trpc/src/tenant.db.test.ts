import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { appRouter } from './index';
import { archiveContract } from './modules/document/router';
import { plumeConfigForSpace, plumeWebhookSecretsFor } from './modules/document/plume-account';
import { issuePaymentLink } from './modules/payment/link';
import { TENANT_EMAIL_LIMITS } from './modules/payment/tenant-mail';
import { ensureFirstSpace } from './modules/space/first-space';
import { saveSsoTokens } from './modules/auth/sso-tokens';

/**
 * What a space outside the platform studio may now do, and on whose behalf:
 * Plume with the tenant's own account, Nuage with the acting user's own
 * session, reminders under the tenant's name within the per-space caps, and a
 * first empty space for a brand-new account. Every test also checks that the
 * platform's Plume token, company identity and data never come into play.
 */

const ISSUER = 'https://sso.tenant.test';
const PLATFORM_TOKEN = 'platform-plume-token-do-not-use';
const TENANT_TOKEN = 'tenant-plume-token-0123456789';
process.env.ENCRYPTION_SECRET ??= 'tenant-test-encryption-secret-0123456789';

const env = {
  OIDC_ISSUER: ISSUER,
  OIDC_CLIENT_ID: 'ardoise',
  OIDC_CLIENT_SECRET: 'client-secret',
  NUAGE_URL: 'https://nuage.test',
  NUAGE_AUDIENCE: 'nuage',
  PLUME_URL: 'https://plume.test',
  PLUME_API_TOKEN: PLATFORM_TOKEN,
  PLUME_WEBHOOK_SECRET: 'platform-webhook-secret-xyz',
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
  BACKEND_URL: 'https://api.tenant.test',
  FRONTEND_URL: 'https://app.tenant.test',
};

type Call = { url: string; method: string; auth: string | null; body: string };
const calls: Call[] = [];
const mails: Array<Record<string, unknown>> = [];
const silent = { debug() {}, error() {}, info() {}, warn() {}, child() { return silent; } };
const realFetch = globalThis.fetch;

async function bodyText(body: unknown): Promise<string> {
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) return String(body.get('request'));
  return typeof body === 'string' ? body : '';
}

const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  const headers = new Headers(init.headers);
  calls.push({ url, method: init.method ?? 'GET', auth: headers.get('authorization'), body: await bodyText(init.body) });
  const json = (value: unknown) => Response.json(value);
  if (url.endsWith('/.well-known/openid-configuration')) return json({ token_endpoint: `${ISSUER}/token` });
  if (url === `${ISSUER}/token`) return json({ access_token: 'nuage-delegated-token', expires_in: 300 });
  if (url.endsWith('/api/webhooks')) return json({ id: 41 });
  if (url.endsWith('/api/documents/signature-requests')) {
    return json({ document: { id: 77 }, signers: [{ email: 'client-t@tenant.test', signing_url: 'https://plume.test/s/t' }] });
  }
  return json({});
}) as typeof fetch;

function callerFor(user: { id: string; email: string } | null) {
  const caller = appRouter.createCaller({
    req: new Request('http://api.test'),
    resHeaders: new Headers(),
    user: user ? { ...user, role: 'MEMBER' } : null,
    db: prisma,
    auth: {},
    storage: { download: async () => new Uint8Array([37, 80, 68, 70]) },
    getStripe: async () => {
      throw new Error('Stripe must not be reached');
    },
    getSmtp: async () => ({ sendEmail: async (options: Record<string, unknown>) => void mails.push(options) }),
    env,
    apiOrigin: 'http://api.test',
    appOrigin: 'http://app.test',
    ipAddress: '203.0.113.9',
    userAgent: 'tenant-test',
    log: silent,
  } as never);
  return (path: string, input?: unknown) => {
    const fn = path.split('.').reduce((node: any, key) => node[key], caller) as (input?: unknown) => Promise<unknown>;
    return fn(input);
  };
}

async function codeOf(call: Promise<unknown>): Promise<string> {
  try {
    await call;
    return 'OK';
  } catch (error) {
    return error instanceof TRPCError ? error.code : `THROWN: ${(error as Error).message}`;
  }
}

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('tenant spaces act on their own behalf', () => {
  const ids: Record<string, string> = {};
  let tina: ReturnType<typeof callerFor>;
  let studio: ReturnType<typeof callerFor>;
  let viewer: ReturnType<typeof callerFor>;
  let release: () => Promise<void> = async () => {};

  const truncate = () =>
    prisma.$executeRawUnsafe(
      'TRUNCATE "User", "Space", "Provider", "Client", "Mission", "Document", "Payment", "AuditLog", "Settings" CASCADE'
    );

  async function seedSpace(key: string, owner: { id: string }, platformStudio: boolean) {
    const space = await prisma.space.create({
      data: { name: `Space ${key}`, platformStudio, members: { create: { userId: owner.id, role: 'OWNER' } } },
    });
    const provider = await prisma.provider.create({
      data: { name: `Provider ${key}`, email: `p-${key}@tenant.test`, iban: `FR76-${key}`, spaceId: space.id },
    });
    const client = await prisma.client.create({
      data: {
        contactFirstName: 'C',
        contactLastName: key,
        companyName: `Client ${key}`,
        contactEmail: `client-${key}@tenant.test`,
        spaceId: space.id,
      },
    });
    const mission = await prisma.mission.create({ data: { name: `Mission ${key}`, clientId: client.id, spaceId: space.id } });
    const base = {
      clientName: client.companyName,
      providerId: provider.id,
      providerName: provider.name,
      providerEmail: provider.email,
      items: [],
      subtotal: 100,
      tva: 0,
      total: 100,
      createdBy: owner.id,
      spaceId: space.id,
      missionId: mission.id,
    };
    const contract = await prisma.document.create({
      data: { ...base, type: 'contrat_prestation', name: `contract-${key}.pdf`, pdfUrl: `http://api.test/storage/documents/${key}.pdf` },
    });
    const invoice = await prisma.document.create({
      data: { ...base, type: 'facture_prestation', name: `invoice-${key}.pdf`, invoiceNumber: `F-${key}` },
    });
    const payment = await prisma.payment.create({
      data: {
        clientId: client.id,
        spaceId: space.id,
        documentId: invoice.id,
        amount: 100,
        totalWithFees: 100,
        dueDate: new Date(Date.now() + 10 * 24 * 3600 * 1000),
        description: `Payment ${key}`,
        reference: `REF-${key}`,
        status: 'PENDING',
        collectionMethod: 'MANUAL',
      } as never,
    });
    Object.assign(ids, {
      [`space${key}`]: space.id,
      [`contract${key}`]: contract.id,
      [`payment${key}`]: payment.id,
      [`client${key}`]: client.id,
    });
  }

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await truncate();
    await prisma.settings.create({ data: { id: 'global', companyName: 'Platform Studio SAS', iban: 'FR76-PLATFORM' } });
    const user = (key: string) =>
      prisma.user.create({
        data: {
          email: `${key}@tenant.test`,
          firstName: key,
          lastName: 'T',
          role: 'MEMBER',
          emailVerified: true,
          accounts: { create: { id: crypto.randomUUID(), providerId: ISSUER, accountId: `sub-${key}` } },
        },
      });
    const tinaRow = await user('tina');
    const sam = await user('sam');
    const vic = await user('vic');
    ids.tina = tinaRow.id;
    await seedSpace('T', tinaRow, false);
    await seedSpace('S', sam, true);
    await prisma.spaceMember.create({ data: { spaceId: ids.spaceT!, userId: vic.id, role: 'MEMBER' } });
    tina = callerFor({ id: tinaRow.id, email: tinaRow.email });
    studio = callerFor({ id: sam.id, email: sam.email });
    viewer = callerFor({ id: vic.id, email: vic.email });
    globalThis.fetch = fakeFetch;
  }, 600_000);

  beforeEach(() => {
    calls.splice(0);
    mails.splice(0);
  });

  afterAll(async () => {
    globalThis.fetch = realFetch;
    await truncate();
    await release();
  }, 120_000);

  it('keeps Plume off for a tenant until its own account is connected', async () => {
    expect(await tina('document.signatureEnabled', { spaceId: ids.spaceT })).toEqual({ enabled: false });
    expect(await codeOf(tina('document.sendForSignature', { id: ids.contractT }))).toBe('PRECONDITION_FAILED');
    expect(calls).toEqual([]);
  });

  it('lets only an admin of the space connect Plume, never with the platform token', async () => {
    const token = { id: ids.spaceT, token: TENANT_TOKEN };
    expect(await codeOf(viewer('space.connectPlume', token))).toBe('FORBIDDEN');
    expect(await codeOf(studio('space.connectPlume', token))).toBe('FORBIDDEN');
    expect(await codeOf(tina('space.connectPlume', { id: ids.spaceT, token: PLATFORM_TOKEN }))).toBe('BAD_REQUEST');
    expect(calls).toEqual([]);
  });

  it('connects the tenant account: checks the token, registers the webhook, keeps both sealed', async () => {
    expect(await tina('space.connectPlume', { id: ids.spaceT, token: TENANT_TOKEN })).toEqual({ plumeConnected: true });
    expect(calls.map((c) => `${c.method} ${c.url} ${c.auth}`)).toEqual([
      `GET https://plume.test/api/auth/me Bearer ${TENANT_TOKEN}`,
      `POST https://plume.test/api/webhooks Bearer ${TENANT_TOKEN}`,
    ]);
    expect(JSON.parse(calls[1]!.body).url).toBe('https://api.tenant.test/webhooks/plume');
    const row = await prisma.spaceSettings.findUniqueOrThrow({ where: { spaceId: ids.spaceT } });
    expect(JSON.stringify(row)).not.toContain(TENANT_TOKEN);
    expect(row.plumeWebhookId).toBe('41');
    const view = await tina('space.getSettings', { id: ids.spaceT });
    expect(view).toMatchObject({ plumeConnected: true });
    expect(JSON.stringify(view)).not.toContain(TENANT_TOKEN);
    expect(await tina('document.signatureEnabled', { spaceId: ids.spaceT })).toEqual({ enabled: true });
  });

  it("sends a tenant contract with the tenant's token and the studio's with the platform token", async () => {
    await tina('document.sendForSignature', { id: ids.contractT });
    await studio('document.sendForSignature', { id: ids.contractS });
    const sends = calls.filter((c) => c.url.endsWith('/signature-requests'));
    expect(sends.map((c) => c.auth)).toEqual([`Bearer ${TENANT_TOKEN}`, `Bearer ${PLATFORM_TOKEN}`]);
    expect(JSON.parse(sends[0]!.body).client.company).toBe('Client T');
  });

  it("accepts Plume events about a tenant document only under that tenant's secret", async () => {
    const tenant = await plumeWebhookSecretsFor(prisma, env, ids.spaceT!);
    const platform = await plumeWebhookSecretsFor(prisma, env, ids.spaceS!);
    expect(tenant).toHaveLength(1);
    expect(tenant).not.toContain(env.PLUME_WEBHOOK_SECRET);
    expect(platform).toEqual([env.PLUME_WEBHOOK_SECRET]);
    expect((await plumeConfigForSpace(prisma, env, ids.spaceS!))?.token).toBe(PLATFORM_TOKEN);
  });

  it("archives a tenant contract in the acting user's own Nuage, through their own Registre session", async () => {
    await saveSsoTokens(
      prisma,
      ISSUER,
      'sub-tina',
      { accessToken: 'tina-registre-access', refreshToken: 'tina-refresh', expiresIn: 3600 },
      env.ENCRYPTION_SECRET!
    );
    await archiveContract(prisma, env as never, { id: ids.contractT!, name: 'contract-T.pdf' }, Buffer.from('%PDF'), ids.tina!);
    const exchange = calls.find((c) => c.url === `${ISSUER}/token`);
    expect(new URLSearchParams(exchange!.body).get('subject_token')).toBe('tina-registre-access');
    const upload = calls.find((c) => c.url.startsWith('https://nuage.test/api/app/object'));
    expect(upload?.auth).toBe('Bearer nuage-delegated-token');
  });

  it("mails a tenant reminder under the tenant's name with replies to the member", async () => {
    await tina('payment.sendReminder', { id: ids.paymentT });
    expect(mails).toHaveLength(1);
    expect(mails[0]).toMatchObject({
      to: 'client-T@tenant.test',
      sender: { name: 'Provider T via Ardoise', replyTo: 'tina@tenant.test' },
    });
    expect(JSON.stringify(mails[0])).not.toContain('Platform Studio');
    expect(await prisma.outboundEmail.count({ where: { spaceId: ids.spaceT } })).toBe(1);
  });

  it('keeps the platform sender for the studio and counts nothing against it', async () => {
    await studio('payment.sendReminder', { id: ids.paymentS });
    expect(mails).toHaveLength(1);
    expect(mails[0]!.sender).toBeUndefined();
    expect(await prisma.outboundEmail.count({ where: { spaceId: ids.spaceS } })).toBe(0);
  });

  it('stops a tenant at the hourly, the daily and the per-member cap, and sends nothing then', async () => {
    const fill = async (count: number, hoursAgo: (i: number) => number, spaceId = ids.spaceT!) => {
      await prisma.outboundEmail.deleteMany({});
      await prisma.outboundEmail.createMany({
        data: Array.from({ length: count }, (_, i) => ({
          spaceId,
          userId: ids.tina!,
          kind: 'payment.reminder',
          createdAt: new Date(Date.now() - hoursAgo(i) * 3600 * 1000),
        })),
      });
      await prisma.payment.update({ where: { id: ids.paymentT }, data: { lastReminderSentAt: null } });
    };
    await fill(TENANT_EMAIL_LIMITS.hour, () => 0.1);
    expect(await codeOf(tina('payment.sendReminder', { id: ids.paymentT }))).toBe('TOO_MANY_REQUESTS');
    await fill(TENANT_EMAIL_LIMITS.day, (i) => 2 + (i % 20));
    expect(await codeOf(tina('payment.sendReminder', { id: ids.paymentT }))).toBe('TOO_MANY_REQUESTS');
    await fill(TENANT_EMAIL_LIMITS.memberDay, () => 3, ids.spaceS!);
    expect(await codeOf(tina('payment.sendReminder', { id: ids.paymentT }))).toBe('TOO_MANY_REQUESTS');
    expect(mails).toEqual([]);
    await fill(TENANT_EMAIL_LIMITS.day - 1, () => 2);
    expect(await codeOf(tina('payment.sendReminder', { id: ids.paymentT }))).toBe('OK');
  });

  it("shows the payer the tenant's name and bank, never the platform's, and takes a declaration", async () => {
    const link = await issuePaymentLink(prisma, ids.paymentT!, env.FRONTEND_URL);
    const token = link.url.split('/').pop();
    const view = (await callerFor(null)('payLink.get', { token })) as Record<string, unknown>;
    expect(view).toMatchObject({ issuer: 'Provider T', canPayOnline: false, canDeclare: true, bank: { iban: 'FR76-T' } });
    expect(JSON.stringify(view)).not.toContain('PLATFORM');
    await callerFor(null)('payLink.declare', { token, declaration: { method: 'TRANSFER' } });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: ids.paymentT } });
    expect(payment.status).toBe('AWAITING_CONFIRMATION');
    expect(mails).toHaveLength(1);
    expect([...(mails[0]!.to as string[])].sort()).toEqual(['tina@tenant.test', 'vic@tenant.test']);
  });

  it('gives a brand-new account one empty space of its own, once, that shows nobody else', async () => {
    const fresh = await prisma.user.create({
      data: { email: 'newcomer@outside.test', firstName: 'New', lastName: 'Comer', role: 'MEMBER', emailVerified: true },
    });
    const [first, second] = await Promise.all([ensureFirstSpace(prisma, fresh), ensureFirstSpace(prisma, fresh)]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(await ensureFirstSpace(prisma, fresh)).toBeNull();
    const newcomer = callerFor({ id: fresh.id, email: fresh.email });
    const spaces = (await newcomer('space.list')) as Array<{ id: string; role: string; name: string }>;
    expect(spaces.map((s) => [s.name, s.role])).toEqual([['New Comer', 'OWNER']]);
    const seen = JSON.stringify(
      await Promise.all(['client.list', 'mission.list', 'document.list', 'payment.list', 'provider.list'].map((p) => newcomer(p, {})))
    );
    for (const secret of Object.values(ids)) expect(seen).not.toContain(secret);
    for (const word of ['Client T', 'Client S', 'Provider T', 'Provider S']) expect(seen).not.toContain(word);
    expect(await ensureFirstSpace(prisma, { id: ids.tina!, firstName: 't', lastName: 'T', email: 'tina@tenant.test' })).toBeNull();
  });

  it('disconnects Plume and removes the webhook from the tenant account', async () => {
    expect(await tina('space.disconnectPlume', { id: ids.spaceT })).toEqual({ plumeConnected: false });
    expect(calls.map((c) => `${c.method} ${c.url} ${c.auth}`)).toEqual([
      `DELETE https://plume.test/api/webhooks/41 Bearer ${TENANT_TOKEN}`,
    ]);
    expect(await plumeConfigForSpace(prisma, env, ids.spaceT!)).toBeNull();
  });
});
