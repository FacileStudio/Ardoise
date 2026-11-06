import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { appRouter } from './index';
import { getStripeService } from './modules/settings/service';
import { paymentService } from './modules/payment/service';

/**
 * The access map of every tRPC procedure. A new procedure fails the first
 * test until it is classified here, and each class is then checked against
 * what the procedure really does:
 *
 * - public: no session.
 * - self: any session, only the caller's own account.
 * - client-portal: CLIENT accounts only, keyed on the caller's own Client row.
 * - member: a space member, touching no space data (or only their memberships).
 * - space-scoped: a space member, and every row comes from a space they belong to.
 * - platform-staff: PLATFORM_STAFF_SUBS only.
 */
type Access = 'public' | 'self' | 'client-portal' | 'member' | 'space-scoped' | 'platform-staff';

const each = (access: Access, paths: string): Record<string, Access> =>
  Object.fromEntries(paths.split(/\s+/).filter(Boolean).map((path) => [path, access]));

const ACCESS: Record<string, Access> = {
  ...each(
    'public',
    `auth.refresh settings.get admin.settings.get payment.getByIdPublic payment.getClientSecret
     magicLink.request magicLink.consume`
  ),
  ...each(
    'self',
    `auth.me auth.logout user.me user.updateProfile user.deleteOwnAccount media.getUploadUrl
     media.getDownloadUrl media.updateAvatar media.updateCover media.removeAvatar media.removeCover`
  ),
  ...each(
    'client-portal',
    `client.me payment.myPayments payment.billingPortal portal.overview portal.documents
     portal.documentDownload portal.signLink`
  ),
  ...each('member', `document.types document.signatureEnabled billing.access space.list space.directory space.create`),
  ...each(
    'space-scoped',
    `client.list client.getById client.create client.update client.transfer client.delete
     payment.list payment.stats payment.getById payment.create payment.createManual payment.setStatus
     payment.delete payment.update payment.cancel payment.sendReminder payment.markExpired payment.retryReceipts
     document.list document.get document.delete document.import document.update document.setSignature
     document.refreshSignLink document.sendForSignature document.download
     document.previewFacturePrestation document.createFacturePrestation document.previewMaintenance
     document.createMaintenance document.previewBackContractuel document.createBackContractuel
     document.previewAppelDeFonds document.createAppelDeFonds document.previewContratPrestation
     document.createContratPrestation document.previewContratMaintenance document.createContratMaintenance
     document.previewPrestationBarman document.createPrestationBarman document.previewPrestationPhoto
     document.createPrestationPhoto document.previewPrestationVideo document.createPrestationVideo
     document.previewPrestationDesign document.createPrestationDesign document.previewPrestationDev
     document.createPrestationDev document.previewPrestationFormation document.createPrestationFormation
     document.previewPrestationBtp document.createPrestationBtp
     provider.list provider.get provider.create provider.update provider.delete
     space.get space.update space.delete space.getMembers space.addMember space.removeMember
     space.updateMemberRole space.leave
     mission.list mission.getById mission.create mission.update mission.setPrestations mission.generateQuote
     mission.acceptQuote mission.generateInvoice mission.setStatus mission.attachDocument
     mission.detachDocument mission.createPayment mission.delete`
  ),
  ...each(
    'platform-staff',
    `admin.settings.getAdmin admin.settings.update admin.settings.requestLogoUpload admin.settings.confirmLogoUpload
     admin.getEntities admin.getEntityConfig admin.list admin.get admin.create admin.update admin.delete
     admin.getPermissions admin.setPermissions admin.getUserPermissions admin.getAuditLogs admin.getAllAuditLogs
     settings.getAdmin settings.update settings.requestLogoUpload settings.confirmLogoUpload
     space.setPlatformStudio
     billing.features billing.saveFeature billing.plans billing.savePlan billing.version billing.createDraft
     billing.saveDraft billing.deleteDraft billing.previewPublish billing.publish billing.migrateSubscribers
     billing.overrides billing.createOverride billing.deleteOverride billing.comps billing.saveComp
     billing.deleteComp billing.spaceComps billing.saveSpaceComp billing.deleteSpaceComp billing.subscriptions
     billing.duplicateSubscriptions billing.pushState billing.pushNow`
  ),
};

type Procedure = { _def: { type: 'query' | 'mutation'; inputs: Array<{ safeParse?: (v: unknown) => any }> } };
const PROCEDURES = (appRouter as unknown as { _def: { procedures: Record<string, Procedure> } })._def.procedures;
const paths = (access: Access) => Object.keys(ACCESS).filter((path) => ACCESS[path] === access);

const ISSUER = 'https://sso.access.test';
const silent = { debug() {}, error() {}, info() {}, warn() {}, child() { return silent; } };
const unreachable = () => {
  throw new Error('must not be reached');
};
const untouchable = new Proxy({}, { get: (_target, key) => (key === 'then' ? undefined : unreachable) });

/** Every platform resource call a procedure makes: emails, Stripe calls and outbound HTTP (Plume, Nuage, webhook). */
const sends = { mail: [] as string[], stripe: [] as string[], http: [] as string[] };
const resetSends = () => Object.values(sends).forEach((list) => list.splice(0));
const recordingSmtp = { sendEmail: async (options: { to: string }) => void sends.mail.push(String(options.to)) };
function recordingStripe(path: string[] = []): unknown {
  return new Proxy(() => {}, {
    get: (_target, key) => (key === 'then' ? undefined : recordingStripe([...path, String(key)])),
    apply: async () => {
      sends.stripe.push(path.join('.'));
      return { id: 'stripe_fake', url: 'https://billing.stripe.test', client_secret: 'secret' };
    },
  });
}
const realFetch = globalThis.fetch;
const recordingFetch = (async (url: string | URL | Request) => {
  sends.http.push(String(url instanceof Request ? url.url : url));
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

function callerFor(user: { id: string; role: string; email: string } | null) {
  const caller = appRouter.createCaller({
    req: new Request('http://api.test'),
    resHeaders: new Headers(),
    user,
    db: prisma,
    auth: untouchable,
    storage: untouchable,
    getStripe: async () => recordingStripe(),
    getSmtp: async () => recordingSmtp,
    env: {
      OIDC_ISSUER: ISSUER,
      PLATFORM_STAFF_SUBS: 'sub-staff',
      PLUME_URL: 'https://plume.test',
      PLUME_API_TOKEN: 'token',
      PLUME_WEBHOOK_SECRET: 'a-long-enough-secret',
      ENCRYPTION_SECRET: 'x'.repeat(32),
      FRONTEND_URL: 'http://app.test',
      MAGIC_LINK_TTL_MINUTES: 15,
      MAGIC_LINK_MAX_PER_EMAIL_HOUR: 5,
      MAGIC_LINK_MAX_PER_IP_HOUR: 20,
    },
    apiOrigin: 'http://api.test',
    appOrigin: 'http://app.test',
    ipAddress: '203.0.113.7',
    userAgent: 'access-test',
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

describe('procedure access map', () => {
  it('classifies every procedure, and only real ones', () => {
    expect(Object.keys(PROCEDURES).filter((path) => !ACCESS[path])).toEqual([]);
    expect(Object.keys(ACCESS).filter((path) => !PROCEDURES[path])).toEqual([]);
  });
});

const enabled = !!process.env.TEST_DATABASE_URL;
process.env.ENCRYPTION_SECRET ??= 'access-test-encryption-secret-0123456789';

describe.skipIf(!enabled)('procedure access against Postgres', () => {
  const ids: Record<string, string> = {};
  let member: ReturnType<typeof callerFor>;
  let client: ReturnType<typeof callerFor>;
  let staff: ReturnType<typeof callerFor>;

  const spaceB = async () =>
    JSON.stringify(
      await prisma.space.findUnique({
        where: { id: ids.spaceB },
        include: {
          members: { orderBy: { id: 'asc' } },
          clients: { include: { user: { select: { id: true, email: true, role: true } } } },
          missions: { include: { providers: true, prestations: true } },
          documents: true,
          payments: true,
          providers: true,
        },
      })
    );


  let release: () => Promise<void> = async () => {};

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await prisma.$executeRawUnsafe(
      'TRUNCATE "User", "Space", "Provider", "Client", "Mission", "Document", "Payment", "AuditLog", "Settings" CASCADE'
    );
    await prisma.settings.create({ data: { id: 'global', webhookUrl: 'https://hook.test/ardoise' } });
    globalThis.fetch = recordingFetch;
    const user = (key: string, role: 'MEMBER' | 'CLIENT', sub?: string) =>
      prisma.user.create({
        data: {
          email: `${key}@access.test`,
          firstName: key,
          lastName: 'T',
          role,
          emailVerified: true,
          ...(sub ? { accounts: { create: { id: crypto.randomUUID(), providerId: ISSUER, accountId: sub } } } : {}),
        },
      });
    const alice = await user('alice', 'MEMBER', 'sub-alice');
    const bob = await user('bob', 'MEMBER', 'sub-bob');
    const yann = await user('yann', 'MEMBER', 'sub-staff');
    const portal = await user('portal', 'CLIENT');
    ids.alice = alice.id;
    ids.bob = bob.id;

    for (const [key, owner] of [
      ['A', alice],
      ['B', bob],
    ] as const) {
      const space = await prisma.space.create({
        data: { name: `Space ${key}`, platformStudio: true, members: { create: { userId: owner.id, role: 'OWNER' } } },
      });
      const provider = await prisma.provider.create({
        data: { name: `Provider ${key}`, email: `p${key}@access.test`, iban: `FR76-${key}`, spaceId: space.id },
      });
      const row = await prisma.client.create({
        data: {
          contactFirstName: 'C',
          contactLastName: key,
          companyName: `Client ${key}`,
          contactEmail: `c${key}@access.test`,
          spaceId: space.id,
          ...(key === 'B' ? { userId: portal.id } : {}),
        },
      });
      const mission = await prisma.mission.create({
        data: {
          name: `Mission ${key}`,
          clientId: row.id,
          spaceId: space.id,
          providers: { create: { providerId: provider.id, role: 'LEAD' } },
        },
      });
      const document = await prisma.document.create({
        data: {
          type: 'contrat_prestation',
          name: `contract-${key}.pdf`,
          contractRef: `CONT-${key}`,
          clientName: row.companyName,
          providerId: provider.id,
          providerName: provider.name,
          providerEmail: provider.email,
          items: [],
          subtotal: 100,
          tva: 20,
          total: 120,
          pdfUrl: `http://api.test/storage/documents/${key}.pdf`,
          createdBy: owner.id,
          spaceId: space.id,
          missionId: mission.id,
        },
      });
      const payment = await prisma.payment.create({
        data: {
          clientId: row.id,
          spaceId: space.id,
          amount: 120,
          totalWithFees: 120,
          dueDate: new Date('2026-12-01'),
          description: `Payment ${key}`,
          reference: `REF-${key}`,
          status: 'PENDING',
          collectionMethod: 'MANUAL',
        } as never,
      });
      Object.assign(ids, {
        [`space${key}`]: space.id,
        [`provider${key}`]: provider.id,
        [`client${key}`]: row.id,
        [`mission${key}`]: mission.id,
        [`document${key}`]: document.id,
        [`payment${key}`]: payment.id,
      });
    }
    await prisma.spaceMember.create({ data: { spaceId: ids.spaceB!, userId: yann.id, role: 'MEMBER' } });

    member = callerFor({ id: alice.id, role: 'MEMBER', email: alice.email });
    client = callerFor({ id: portal.id, role: 'CLIENT', email: portal.email });
    staff = callerFor({ id: yann.id, role: 'MEMBER', email: yann.email });

    const portalA = await user('portal-a', 'CLIENT');
    await prisma.client.update({ where: { id: ids.clientA }, data: { userId: portalA.id } });
    const portalC = await user('portal-c', 'CLIENT');
    const spaceC = await prisma.space.create({
      data: { name: 'Tenant C', platformStudio: false, members: { create: { userId: alice.id, role: 'OWNER' } } },
    });
    const clientC = await prisma.client.create({
      data: {
        contactFirstName: 'V',
        contactLastName: 'C',
        companyName: 'Victim C',
        contactEmail: 'victim@outside.test',
        stripeCustomerId: 'cus_c',
        spaceId: spaceC.id,
        userId: portalC.id,
      },
    });
    const missionC = await prisma.mission.create({ data: { name: 'Mission C', clientId: clientC.id, spaceId: spaceC.id } });
    const contractC = await prisma.document.create({
      data: {
        type: 'contrat_prestation',
        name: 'contract-c.pdf',
        clientName: clientC.companyName,
        providerName: 'P',
        providerEmail: 'p@outside.test',
        items: [],
        subtotal: 100,
        tva: 20,
        total: 120,
        pdfUrl: 'http://api.test/storage/documents/c.pdf',
        plumeDocumentId: 'plume-c',
        createdBy: alice.id,
        spaceId: spaceC.id,
        missionId: missionC.id,
      },
    });
    const invoiceC = await prisma.document.create({
      data: {
        type: 'facture_prestation',
        name: 'invoice-c.pdf',
        invoiceNumber: 'F-C',
        clientName: clientC.companyName,
        providerName: 'P',
        items: [],
        subtotal: 100,
        tva: 20,
        total: 120,
        createdBy: alice.id,
        spaceId: spaceC.id,
        missionId: missionC.id,
      },
    });
    const payment = (data: Record<string, unknown>) =>
      prisma.payment.create({
        data: {
          clientId: clientC.id,
          spaceId: spaceC.id,
          amount: 120,
          totalWithFees: 120,
          dueDate: new Date('2026-12-01'),
          description: 'C',
          ...data,
        } as never,
      });
    const paidC = await payment({ status: 'PAID', collectionMethod: 'MANUAL', reference: 'PAID-C' });
    const stripeC = await payment({
      status: 'PENDING',
      collectionMethod: 'STRIPE',
      reference: 'STRIPE-C',
      stripePaymentIntentId: 'pi_c',
      stripeSubscriptionId: 'sub_c',
    });
    Object.assign(ids, {
      spaceC: spaceC.id,
      clientC: clientC.id,
      missionC: missionC.id,
      contractC: contractC.id,
      invoiceC: invoiceC.id,
      paidC: paidC.id,
      stripeC: stripeC.id,
      portalA: portalA.id,
      portalC: portalC.id,
    });
  }, 600_000);

  afterAll(async () => {
    globalThis.fetch = realFetch;
    await prisma.$executeRawUnsafe(
      'TRUNCATE "User", "Space", "Provider", "Client", "Mission", "Document", "Payment", "AuditLog", "Settings" CASCADE'
    );
    await release();
  }, 120_000);

  it('refuses a CLIENT on every member, space-scoped and platform-staff procedure', async () => {
    const leaks: string[] = [];
    for (const path of [...paths('member'), ...paths('space-scoped'), ...paths('platform-staff')]) {
      const code = await codeOf(client(path, {}));
      if (code !== 'FORBIDDEN') leaks.push(`${path}: ${code}`);
    }
    expect(leaks).toEqual([]);
  });

  it('refuses a non-staff member on every platform-staff procedure', async () => {
    const leaks: string[] = [];
    for (const path of paths('platform-staff')) {
      const code = await codeOf(member(path, {}));
      if (code !== 'FORBIDDEN') leaks.push(`${path}: ${code}`);
    }
    expect(leaks).toEqual([]);
  });

  it('refuses a member on every client-portal procedure', async () => {
    const leaks: string[] = [];
    for (const path of paths('client-portal')) {
      const code = await codeOf(member(path, { id: ids.documentB }));
      if (code !== 'FORBIDDEN') leaks.push(`${path}: ${code}`);
    }
    expect(leaks).toEqual([]);
  });

  it('lets listed staff through, whatever their role', async () => {
    expect(await staff('billing.access')).toEqual({ staff: true });
    expect(await codeOf(staff('settings.getAdmin'))).toBe('OK');
    expect(await member('billing.access')).toEqual({ staff: false });
  });

  /** A valid input for each space-scoped procedure, pointing at space B's rows. */
  function inputFor(path: string): unknown {
    const [module, name] = path.split('.') as [string, string];
    const idOf: Record<string, string | undefined> = {
      client: ids.clientB,
      payment: ids.paymentB,
      document: ids.documentB,
      mission: ids.missionB,
      provider: ids.providerB,
      space: ids.spaceB,
    };
    const line = { description: 'Line', quantity: 1, price: 100, unit_price: 100, unit: 'u', total: 100 };
    const base = {
      id: idOf[module],
      spaceId: ids.spaceB,
      targetSpaceId: ids.spaceB,
      clientId: ids.clientB,
      providerId: ids.providerB,
      missionId: ids.missionB,
      documentId: ids.documentB,
      quoteId: ids.documentB,
      userId: ids.bob,
      email: 'bob@access.test',
      role: 'MEMBER',
      mode: 'move',
      name: 'Renamed',
      description: 'Changed',
      status: 'PAID',
      amount: 1,
      reference: 'REF',
      collectionMethod: 'MANUAL',
      contactFirstName: 'X',
      contactLastName: 'Y',
      companyName: 'Z',
      type: 'devis',
      number: 'IMP-1',
      issuedAt: new Date('2026-01-01'),
      pdfKey: `uploads/${ids.alice}/x.pdf`,
      total: 120,
      signatureStatus: 'signed',
      providers: [{ providerId: ids.providerB, id: ids.providerB, role: 'LEAD', amount: 1 }],
      payment_providers: [{ id: ids.providerB, amount_to_pay: 1 }],
      lines: [{ label: 'Line', description: 'Line', quantity: 1, unitPrice: 100, providerId: ids.providerB }],
      items: [line],
      features: [{ title: 'F', desc: 'D' }],
      invoice_number: 'F-1',
      invoice_date: '2026-01-01',
      due_date: '2026-02-01',
      quote_number: 'D-1',
      quote_date: '2026-01-01',
      validity_date: '2026-02-01',
      maintenance_period: '12 mois',
      contract_reference: 'C-1',
      contract_date: '2026-01-01',
      project_name: 'P',
      valid_until: '2026-02-01',
      global_invoice_ref: 'G-1',
      project_step: 'S',
      tva_rate: 20,
      dueDate: new Date('2026-12-01'),
      kind: 'TOTAL',
      prestations: [{ label: 'Line', description: 'Line', quantity: 1, unitPrice: 100, providerId: ids.providerB }],
      event_date: '2026-01-01',
      event_time: '20:00',
      event_location: 'Paris',
      service_duration: '4h',
      bar_setup_type: 'mobile',
      shoot_date: '2026-01-01',
      shoot_time: '10:00',
      shoot_location: 'Paris',
      shoot_duration: '2h',
      shoot_type: 'portrait',
      video_type: 'clip',
      project_type: 'site',
      delivery_date: '2026-02-01',
      tech_stack: 'ts',
      training_date: '2026-01-01',
      training_time: '09:00',
      training_location: 'Paris',
      training_duration: '1j',
      training_topic: 'T',
      site_address: '1 rue',
      site_name: 'S',
      work_start_date: '2026-01-01',
      work_type: 'W',
    };
    const overrides: Record<string, Record<string, unknown>> = {
      'provider.update': { id: ids.providerB, data: { iban: 'FR76-ATTACKER' } },
      'client.create': { createCredentials: false },
      'document.setSignature': { status: 'signed', signedAt: new Date('2026-01-02') },
      'space.update': { id: ids.spaceB, name: 'Space B' },
      'payment.update': { description: 'Changed' },
      'mission.update': { providers: undefined },
    };
    return { ...base, ...(overrides[path] ?? {}) };
  }

  it('builds a valid input for every space-scoped procedure', () => {
    const invalid: string[] = [];
    for (const path of paths('space-scoped')) {
      const parser = PROCEDURES[path]!._def.inputs[0];
      if (!parser?.safeParse) continue;
      const result = parser.safeParse(inputFor(path));
      if (!result.success) {
        invalid.push(`${path}: ${result.error.issues.map((i: any) => i.path.join('.') || i.message).join(', ')}`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it('never lets a member of space A read or change space B', async () => {
    resetSends();
    let before = await spaceB();
    const secrets = [ids.clientB, ids.paymentB, ids.documentB, ids.missionB, ids.providerB, 'FR76-B', 'Client B'];
    const leaks: string[] = [];
    for (const path of paths('space-scoped')) {
      let output: unknown;
      let code: string;
      try {
        output = await member(path, inputFor(path));
        code = 'OK';
      } catch (error) {
        code = error instanceof TRPCError ? error.code : `THROWN: ${(error as Error).message}`;
      }
      if (code === 'OK') {
        const json = JSON.stringify(output) ?? '';
        const seen = secrets.filter((secret) => secret && json.includes(secret!));
        if (seen.length > 0) leaks.push(`${path}: returned ${seen.join(', ')}`);
      } else if (code !== 'FORBIDDEN' && code !== 'NOT_FOUND') {
        leaks.push(`${path}: ${code}`);
      }
      const after = await spaceB();
      if (after !== before) leaks.push(`${path}: changed space B`);
      before = after;
      const spent = [...sends.mail, ...sends.stripe, ...sends.http];
      if (spent.length > 0) leaks.push(`${path}: spent ${spent.join(', ')}`);
      resetSends();
    }
    expect(leaks).toEqual([]);
  }, 120_000);

  it('lets nobody but staff change the Stripe and SMTP settings billing reads', async () => {
    const legacy = await prisma.user.create({
      data: {
        email: 'legacy-admin@access.test',
        firstName: 'L',
        lastName: 'A',
        role: 'ADMIN',
        accounts: { create: { id: crypto.randomUUID(), providerId: ISSUER, accountId: 'sub-legacy' } },
      },
    });
    const admin = callerFor({ id: legacy.id, role: 'ADMIN', email: legacy.email });
    const attack = {
      stripeSecretKey: 'sk_live_attacker',
      stripeWebhookSecret: 'whsec_attacker',
      stripePublishableKey: 'pk_live_attacker',
      smtpHost: 'smtp.attacker.test',
      smtpPass: 'attacker',
    };
    const row = async () => JSON.stringify(await prisma.settings.findUnique({ where: { id: 'global' } }));
    const before = await row();

    for (const caller of [member, admin]) {
      for (const path of ['settings.update', 'admin.settings.update']) {
        expect(await codeOf(caller(path, attack))).toBe('FORBIDDEN');
      }
      expect(await codeOf(caller('settings.getAdmin'))).toBe('FORBIDDEN');
    }
    expect(await row()).toBe(before);

    await staff('settings.update', { stripeSecretKey: 'sk_test_staff', stripeWebhookSecret: 'whsec_staff' });
    const stripe = await getStripeService(prisma);
    expect((stripe as unknown as { webhookSecret: string }).webhookSecret).toBe('whsec_staff');
    await prisma.user.delete({ where: { id: legacy.id } });
  });

  it('spends no platform mail, Stripe, Plume or webhook on a space outside the platform studio', async () => {
    const portalC = callerFor({ id: ids.portalC!, role: 'CLIENT', email: 'portal-c@access.test' });
    const anonymous = callerFor(null);
    const calls: Array<[string, () => Promise<unknown>, string[]]> = [
      ['payment.sendReminder', () => member('payment.sendReminder', { id: ids.stripeC }), ['FORBIDDEN']],
      [
        'payment.create',
        () =>
          member('payment.create', {
            clientId: ids.clientC,
            amount: 10,
            description: 'x',
            collectionMethod: 'STRIPE',
            dueDate: new Date('2026-12-01'),
          }),
        ['FORBIDDEN'],
      ],
      [
        'mission.createPayment',
        () => member('mission.createPayment', { id: ids.missionC, documentId: ids.invoiceC, collectionMethod: 'STRIPE' }),
        ['FORBIDDEN', 'BAD_REQUEST', 'PRECONDITION_FAILED', 'CONFLICT'],
      ],
      ['payment.cancel', () => member('payment.cancel', { id: ids.stripeC }), ['FORBIDDEN']],
      ['payment.billingPortal', () => portalC('payment.billingPortal', { id: ids.stripeC }), ['FORBIDDEN']],
      ['payment.getClientSecret', () => anonymous('payment.getClientSecret', { id: ids.stripeC }), ['FORBIDDEN']],
      [
        'client.create',
        () =>
          member('client.create', {
            spaceId: ids.spaceC,
            contactFirstName: 'N',
            contactLastName: 'N',
            companyName: 'N',
            contactEmail: 'spam@outside.test',
            createCredentials: true,
            credentialEmail: 'spam@outside.test',
          }),
        ['FORBIDDEN'],
      ],
      ['magicLink.request', () => anonymous('magicLink.request', { email: 'portal-c@access.test' }), ['OK']],
      ['document.sendForSignature', () => member('document.sendForSignature', { id: ids.contractC }), ['FORBIDDEN']],
      ['document.refreshSignLink', () => member('document.refreshSignLink', { id: ids.contractC }), ['OK']],
      ['portal.signLink', () => portalC('portal.signLink', { id: ids.contractC }), ['OK', 'NOT_FOUND', 'PRECONDITION_FAILED']],
      ['client.update', () => member('client.update', { id: ids.clientC, companyName: 'Victim C2' }), ['OK']],
      [
        'client.transfer',
        () => member('client.transfer', { id: ids.clientA, mode: 'copy', targetSpaceId: ids.spaceC }),
        ['FORBIDDEN'],
      ],
    ];
    const problems: string[] = [];
    for (const [name, call, allowed] of calls) {
      resetSends();
      const code = await codeOf(call());
      if (!allowed.includes(code)) problems.push(`${name}: ${code}`);
      const spent = [...sends.mail, ...sends.stripe, ...sends.http];
      if (spent.length > 0) problems.push(`${name}: spent ${spent.join(', ')}`);
    }
    expect(problems).toEqual([]);
    expect(await member('document.signatureEnabled', { spaceId: ids.spaceC })).toEqual({ enabled: false });
    expect(await member('document.signatureEnabled', { spaceId: ids.spaceA })).toEqual({ enabled: true });
  });

  it('never renders or mails a receipt for a space outside the platform studio', async () => {
    const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 'global' } });
    await prisma.settings.delete({ where: { id: 'global' } });
    try {
      resetSends();
      expect(await member('payment.retryReceipts', { spaceId: ids.spaceC })).toEqual({ attempted: 0, succeeded: 0 });
      await expect(
        paymentService.generateAndSendReceipt(prisma, untouchable as never, recordingSmtp as never, {} as never, ids.paidC!)
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      const paid = await prisma.payment.findUniqueOrThrow({ where: { id: ids.paidC } });
      expect(paid.receiptAttempts).toBe(0);
      expect(paid.receiptUrl).toBeNull();
      expect(sends.mail).toEqual([]);
    } finally {
      await prisma.settings.create({ data: settings as never });
    }
  });

  it('still spends them for a platform studio space, so the recorders see real sends', async () => {
    resetSends();
    await member('client.update', { id: ids.clientA, companyName: 'Client A2' });
    await callerFor(null)('magicLink.request', { email: 'portal-a@access.test' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sends.http).toEqual(['https://hook.test/ardoise']);
    expect(sends.mail).toEqual(['portal-a@access.test']);
  });

  it('never moves a space A client into a space the member does not belong to', async () => {
    expect(
      await codeOf(member('client.transfer', { id: ids.clientA, mode: 'move', targetSpaceId: ids.spaceB }))
    ).toBe('FORBIDDEN');
  });
});
