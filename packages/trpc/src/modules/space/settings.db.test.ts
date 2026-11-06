import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { appRouter } from '../../index';
import { encryptSecret } from '../settings/service';
import { dispatchConfiguredWebhook } from '../webhook/service';
import { buildPartyAndLegalData, loadDocumentContext } from '../document/service';

const enabled = !!process.env.TEST_DATABASE_URL;
process.env.ENCRYPTION_SECRET ??= 'space-settings-test-encryption-secret-0123456789';

const silent = { debug() {}, error() {}, info() {}, warn() {}, child() { return silent; } };

function callerFor(user: { id: string; role: string; email: string }) {
  return appRouter.createCaller({
    req: new Request('http://api.test'),
    resHeaders: new Headers(),
    user,
    db: prisma,
    env: { PLATFORM_STAFF_SUBS: '', ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET },
    apiOrigin: 'http://api.test',
    appOrigin: 'http://app.test',
    ipAddress: '203.0.113.7',
    userAgent: 'settings-test',
    log: silent,
  } as never);
}

async function codeOf(call: Promise<unknown>): Promise<string> {
  try {
    await call;
    return 'OK';
  } catch (error) {
    return error instanceof TRPCError ? error.code : `THROWN: ${(error as Error).message}`;
  }
}

describe.skipIf(!enabled)('space settings against Postgres', () => {
  const ids: Record<string, string> = {};
  let release: () => Promise<void> = async () => {};
  let adminA: ReturnType<typeof callerFor>;
  let memberA: ReturnType<typeof callerFor>;
  let adminB: ReturnType<typeof callerFor>;

  const wipe = () =>
    prisma.$executeRawUnsafe('TRUNCATE "User", "Space", "Client", "Provider", "AuditLog" CASCADE');

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await wipe();
    const user = (key: string) =>
      prisma.user.create({ data: { email: `${key}@settings.test`, firstName: key, lastName: 'T', role: 'MEMBER' } });
    const [alice, amy, bob] = await Promise.all([user('alice'), user('amy'), user('bob')]);
    const spaceA = await prisma.space.create({
      data: { name: 'A', members: { create: [{ userId: alice.id, role: 'ADMIN' }, { userId: amy.id, role: 'MEMBER' }] } },
    });
    const spaceB = await prisma.space.create({ data: { name: 'B', members: { create: { userId: bob.id, role: 'OWNER' } } } });
    Object.assign(ids, { alice: alice.id, amy: amy.id, bob: bob.id, spaceA: spaceA.id, spaceB: spaceB.id });
    adminA = callerFor({ id: alice.id, role: 'MEMBER', email: alice.email });
    memberA = callerFor({ id: amy.id, role: 'MEMBER', email: amy.email });
    adminB = callerFor({ id: bob.id, role: 'MEMBER', email: bob.email });
  }, 600_000);

  afterAll(async () => {
    await wipe();
    await release();
  }, 120_000);

  it('answers French defaults before anything is saved', async () => {
    const settings = await adminA.space.getSettings({ id: ids.spaceA! });
    expect(settings).toMatchObject({
      paymentTermsDays: 30,
      lateFeeRate: "3 fois le taux d'intérêt légal en vigueur",
      recoveryFeeAmount: 40,
      invoiceNumberFormat: 'FAC-{{year}}-{{number}}',
      webhookUrl: null,
      webhookSecretSet: false,
    });
  });

  it('lets a space admin save, and writes an audit entry without the secret', async () => {
    const saved = await adminA.space.updateSettings({
      id: ids.spaceA!,
      paymentTermsDays: 45,
      legalMentions: 'Escompte pour paiement anticipé : néant.',
      invoiceNumberFormat: 'A-{{year}}-{{number}}',
    });
    expect(saved).toMatchObject({ paymentTermsDays: 45, invoiceNumberFormat: 'A-{{year}}-{{number}}' });
    const audit = JSON.stringify(await prisma.auditLog.findMany({ where: { entity: 'spaceSettings' } }));
    expect(audit).toContain('paymentTermsDays');
  });

  it('refuses a plain member, another space, and keeps the other space untouched', async () => {
    expect(await codeOf(memberA.space.updateSettings({ id: ids.spaceA!, paymentTermsDays: 1 }))).toBe('FORBIDDEN');
    const before = JSON.stringify(await prisma.spaceSettings.findMany({ orderBy: { spaceId: 'asc' } }));

    expect(await codeOf(adminB.space.updateSettings({ id: ids.spaceA!, paymentTermsDays: 1 }))).toBe('FORBIDDEN');
    expect(await codeOf(adminB.space.getSettings({ id: ids.spaceA! }))).toBe('FORBIDDEN');
    expect(await codeOf(adminA.space.updateSettings({ id: ids.spaceB!, paymentTermsDays: 1 }))).toBe('FORBIDDEN');
    expect(await codeOf(adminA.space.getSettings({ id: ids.spaceB! }))).toBe('FORBIDDEN');
    expect(JSON.stringify(await prisma.spaceSettings.findMany({ orderBy: { spaceId: 'asc' } }))).toBe(before);
  });

  it('rejects a format without a number and unknown fields', async () => {
    expect(await codeOf(adminA.space.updateSettings({ id: ids.spaceA!, invoiceNumberFormat: 'FAC-2026' }))).toBe(
      'BAD_REQUEST'
    );
    expect(await codeOf(adminA.space.updateSettings({ id: ids.spaceA!, platformStudio: true } as never))).toBe(
      'BAD_REQUEST'
    );
  });

  it('refuses unsafe webhook URLs and stores nothing', async () => {
    for (const url of [
      'http://hooks.example.test/in',
      'https://127.0.0.1/in',
      'https://169.254.169.254/latest',
      'https://[::1]/in',
      'https://localhost/in',
    ]) {
      expect(await codeOf(adminA.space.updateSettings({ id: ids.spaceA!, webhookUrl: url }))).toBe('BAD_REQUEST');
    }
    expect((await prisma.spaceSettings.findUniqueOrThrow({ where: { spaceId: ids.spaceA! } })).webhookUrl).toBeNull();
  });

  it('refuses a secret without a URL', async () => {
    expect(
      await codeOf(adminA.space.updateSettings({ id: ids.spaceA!, webhookSecret: 'a-secret-of-16-chars' }))
    ).toBe('BAD_REQUEST');
  });

  it('encrypts the secret at rest and never returns it', async () => {
    await prisma.spaceSettings.update({ where: { spaceId: ids.spaceA! }, data: { webhookUrl: 'https://hooks.example.test/in' } });
    const secret = 'a-secret-of-16-chars';
    const saved = await adminA.space.updateSettings({ id: ids.spaceA!, webhookSecret: secret });
    expect(saved.webhookSecretSet).toBe(true);
    expect(JSON.stringify(saved)).not.toContain(secret);
    expect(JSON.stringify(await adminA.space.getSettings({ id: ids.spaceA! }))).not.toContain(secret);

    const row = await prisma.spaceSettings.findUniqueOrThrow({ where: { spaceId: ids.spaceA! } });
    expect(row.webhookSecret).not.toBeNull();
    expect(row.webhookSecret).not.toContain(secret);
    expect(JSON.stringify(await prisma.auditLog.findMany({ where: { entity: 'spaceSettings' } }))).not.toContain(secret);

    const asMember = await memberA.space.getSettings({ id: ids.spaceA! });
    expect(asMember.webhookUrl).toBeNull();
    expect(asMember.webhookSecretSet).toBe(false);
  });

  it('delivers a signed event to the space webhook only, with the platform signer', async () => {
    const secret = 'a-secret-of-16-chars';
    await prisma.spaceSettings.upsert({
      where: { spaceId: ids.spaceB! },
      create: { spaceId: ids.spaceB!, webhookUrl: 'https://other.example.test/in', webhookSecret: encryptSecret('b-secret-of-16-chars!') },
      update: { webhookUrl: 'https://other.example.test/in', webhookSecret: encryptSecret('b-secret-of-16-chars!') },
    });
    const sent: Array<{ host: string; headers: Record<string, string>; body: string }> = [];
    const deps = {
      resolver: async () => ['93.184.216.34'],
      transport: async (target: { url: URL }, headers: Record<string, string>, body: string) => {
        sent.push({ host: target.url.hostname, headers, body });
        return 200;
      },
    };
    await dispatchConfiguredWebhook({
      db: prisma,
      log: silent as never,
      spaceId: ids.spaceA!,
      event: 'payment.paid',
      data: { id: 'p1' },
      deps,
    });

    expect(sent.map((request) => request.host)).toEqual(['hooks.example.test']);
    const [request] = sent;
    const expected = `sha256=${createHmac('sha256', secret).update(request!.body).digest('hex')}`;
    expect(request!.headers['x-ardoise-signature-256']).toBe(expected);
    expect(request!.body).not.toContain(ids.spaceB!);
  });

  it('survives an unsafe stored URL, an unreadable secret and a failing endpoint', async () => {
    await prisma.spaceSettings.update({ where: { spaceId: ids.spaceB! }, data: { webhookUrl: 'https://127.0.0.1/in' } });
    let called = 0;
    const deps = {
      resolver: async () => ['93.184.216.34'],
      transport: async () => {
        called += 1;
        return 500;
      },
    };
    const send = (spaceId: string) =>
      dispatchConfiguredWebhook({ db: prisma, log: silent as never, spaceId, event: 'x', data: {}, deps });

    await send(ids.spaceB!);
    expect(called).toBe(0);

    await prisma.spaceSettings.update({
      where: { spaceId: ids.spaceB! },
      data: { webhookUrl: 'https://other.example.test/in', webhookSecret: 'not-a-ciphertext' },
    });
    await send(ids.spaceB!);
    expect(called).toBe(0);

    await prisma.spaceSettings.update({ where: { spaceId: ids.spaceB! }, data: { webhookSecret: null } });
    await send(ids.spaceB!);
    expect(called).toBe(1);
  });

  it('starts a document from the space defaults, not another space and not the platform', async () => {
    const provider = await prisma.provider.create({ data: { name: 'P', email: 'p@settings.test', spaceId: ids.spaceA! } });
    const providerB = await prisma.provider.create({ data: { name: 'PB', email: 'pb@settings.test', spaceId: ids.spaceB! } });
    const clientOf = (spaceId: string, key: string) =>
      prisma.client.create({
        data: { contactFirstName: 'C', contactLastName: key, companyName: `Client ${key}`, contactEmail: `${key}@settings.test`, spaceId },
      });
    const clientA = await clientOf(ids.spaceA!, 'a');
    const clientB = await clientOf(ids.spaceB!, 'b');

    const a = await loadDocumentContext(prisma, ids.alice!, clientA.id, provider.id);
    const partyA = buildPartyAndLegalData(a.client, a.provider, a.settings);
    expect(partyA.payment_terms_days).toBe(45);
    expect(partyA.legal_mentions).toBe('Escompte pour paiement anticipé : néant.');

    const b = await loadDocumentContext(prisma, ids.bob!, clientB.id, providerB.id);
    const partyB = buildPartyAndLegalData(b.client, b.provider, b.settings);
    expect(partyB.payment_terms_days).toBe(30);
    expect(partyB.legal_mentions).toBe('');
    expect(partyB.late_fee_rate).toBe("3 fois le taux d'intérêt légal en vigueur");

    await expect(loadDocumentContext(prisma, ids.alice!, clientB.id, providerB.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
