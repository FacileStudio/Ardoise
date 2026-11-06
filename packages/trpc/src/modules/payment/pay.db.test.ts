import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import type Stripe from 'stripe';
import { appRouter } from '../../index';
import { paymentService } from './service';
import { hashToken, issuePaymentLink } from './link';
import { sendOpenPaymentLinks } from './open-links';

const enabled = !!process.env.TEST_DATABASE_URL;
process.env.ENCRYPTION_SECRET ??= 'pay-test-encryption-secret-0123456789';

const silent = { debug() {}, error() {}, info() {}, warn() {}, child() { return silent; } };
const untouchable = new Proxy({}, { get: (_t, key) => (key === 'then' ? undefined : () => { throw new Error('unreachable'); }) });

const stripeCalls: Array<{ params: any; options: any }> = [];
const sessions = new Map<string, any>();
const cancelled: string[] = [];
let legacyCancelError: { code?: string } | null = null;
const fakeStripe = {
  client: {
    checkout: {
      sessions: {
        create: async (params: any, options: any) => {
          stripeCalls.push({ params, options });
          const id = `cs_test_${sessions.size + 1}`;
          const session = {
            id,
            status: 'open',
            url: `https://checkout.stripe.com/c/pay/${id}`,
            amount_total: params.line_items[0].price_data.unit_amount,
            currency: params.line_items[0].price_data.currency,
            mode: params.mode,
            success_url: params.success_url,
          };
          sessions.set(id, session);
          return session;
        },
        retrieve: async (id: string) => {
          const session = sessions.get(id);
          if (!session) throw Object.assign(new Error('missing'), { code: 'resource_missing' });
          return session;
        },
        expire: async (id: string) => {
          const session = sessions.get(id);
          if (session) session.status = 'expired';
          return session;
        },
      },
    },
    paymentIntents: {
      cancel: async () => {
        if (legacyCancelError) throw Object.assign(new Error('cannot cancel'), legacyCancelError);
        return {};
      },
    },
    subscriptions: { cancel: async (id: string) => void cancelled.push(id) },
    customers: { create: async () => ({ id: 'cus_new' }) },
    billingPortal: {
      configurations: { list: async () => ({ data: [] }), create: async () => ({ id: 'bpc_1' }) },
      sessions: { create: async () => ({ url: 'https://billing.stripe.com/p/session/x' }) },
    },
  },
};
const openSessions = () => [...sessions.values()].filter((session) => session.status === 'open');
const mails: Array<{ to: unknown; subject: string }> = [];
const smtp = { sendEmail: async (o: any) => void mails.push({ to: o.to, subject: o.subject }) };

function callerFor(user: { id: string; role: string; email: string } | null) {
  const caller = appRouter.createCaller({
    req: new Request('http://api.test'),
    resHeaders: new Headers(),
    user,
    db: prisma,
    auth: untouchable,
    storage: untouchable,
    getStripe: async () => fakeStripe,
    getSmtp: async () => smtp,
    env: { FRONTEND_URL: 'http://app.test', ENCRYPTION_SECRET: 'x'.repeat(32) },
    apiOrigin: 'http://api.test',
    appOrigin: 'http://spoofed.test',
    ipAddress: '203.0.113.7',
    userAgent: 'pay-test',
    log: silent,
  } as never);
  return (path: string, input?: unknown) =>
    (path.split('.').reduce((node: any, key) => node[key], caller) as any)(input);
}

const codeOf = async (call: Promise<unknown>) => {
  try {
    await call;
    return 'OK';
  } catch (error) {
    return error instanceof TRPCError ? error.code : `THROWN: ${(error as Error).message}`;
  }
};

const sessionEvent = (id: string, type: string, session: Partial<Stripe.Checkout.Session>) =>
  ({ id, type, data: { object: { id: 'cs_test_1', ...session } } }) as unknown as Stripe.Event;

describe.skipIf(!enabled)('client payments against Postgres', () => {
  let release: () => Promise<void> = async () => {};
  const ids: Record<string, string> = {};
  let receipts = 0;
  const realReceipt = paymentService.generateAndSendReceipt;

  const makePayment = (data: Record<string, unknown> = {}) =>
    prisma.payment.create({
      data: {
        clientId: ids.clientA,
        spaceId: ids.space,
        amount: 100,
        totalWithFees: 100,
        dueDate: new Date('2027-01-01'),
        description: 'Site vitrine',
        status: 'PENDING',
        collectionMethod: 'STRIPE',
        ...data,
      } as never,
    });

  const deliver = (event: Stripe.Event) =>
    paymentService.handleWebhook(
      prisma,
      untouchable as never,
      smtp as never,
      { FRONTEND_URL: 'http://app.test' } as never,
      event,
      async () => fakeStripe as never
    );

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await prisma.$executeRawUnsafe(
      'TRUNCATE "User", "Space", "Client", "Payment", "AuditLog", "Settings", "WebhookEvent" CASCADE'
    );
    await prisma.settings.create({
      data: { id: 'global', companyName: 'Facile Studio', iban: 'FR7612345', bic: 'BICXX' },
    });
    const member = await prisma.user.create({
      data: { email: 'admin@pay.test', firstName: 'A', lastName: 'M', role: 'MEMBER', emailVerified: true },
    });
    const outsider = await prisma.user.create({
      data: { email: 'out@pay.test', firstName: 'O', lastName: 'S', role: 'MEMBER', emailVerified: true },
    });
    const space = await prisma.space.create({
      data: { name: 'Studio', platformStudio: true, members: { create: { userId: member.id, role: 'OWNER' } } },
    });
    await prisma.space.create({
      data: { name: 'Other', members: { create: { userId: outsider.id, role: 'OWNER' } } },
    });
    for (const key of ['A', 'B']) {
      const user = await prisma.user.create({
        data: { email: `client-${key}@pay.test`, firstName: key, lastName: 'C', role: 'CLIENT', emailVerified: true },
      });
      const client = await prisma.client.create({
        data: {
          spaceId: space.id,
          userId: user.id,
          contactFirstName: key,
          contactLastName: 'C',
          companyName: `Client ${key}`,
          contactEmail: `client-${key}@pay.test`,
        },
      });
      Object.assign(ids, { [`client${key}`]: client.id, [`user${key}`]: user.id });
    }
    Object.assign(ids, { space: space.id, member: member.id, outsider: outsider.id });
    (paymentService as any).generateAndSendReceipt = async () => void (receipts += 1);
  }, 120_000);

  afterAll(async () => {
    (paymentService as any).generateAndSendReceipt = realReceipt;
    await release();
  });

  beforeEach(() => {
    stripeCalls.length = 0;
    sessions.clear();
    cancelled.length = 0;
    legacyCancelError = null;
    mails.length = 0;
    receipts = 0;
  });

  const clientA = () => callerFor({ id: ids.userA, role: 'CLIENT', email: 'client-A@pay.test' });
  const admin = () => callerFor({ id: ids.member, role: 'MEMBER', email: 'admin@pay.test' });
  const anonymous = () => callerFor(null);

  describe('pay link', () => {
    it('stores only a hash, and the token opens exactly one payment', async () => {
      const payment = await makePayment();
      const { url } = await issuePaymentLink(prisma, payment.id, 'http://app.test');
      const token = url.split('/pay/')[1]!;

      expect(token).toHaveLength(43);
      const row = await prisma.paymentLink.findFirstOrThrow({ where: { paymentId: payment.id } });
      expect(row.tokenHash).toBe(hashToken(token));
      expect(JSON.stringify(row)).not.toContain(token);

      const view = (await anonymous()('payLink.get', { token })) as Record<string, unknown>;
      expect(view).toMatchObject({ amount: 100, currency: 'EUR', issuer: 'Facile Studio', canPayOnline: true });
      expect(Object.keys(view).sort()).toEqual(
        ['amount', 'bank', 'canDeclare', 'canManage', 'canPayOnline', 'currency', 'declared', 'description',
          'dueDate', 'frequency', 'issuer', 'reference', 'status'].sort()
      );
      expect(JSON.stringify(view)).not.toContain(payment.id);
      expect(JSON.stringify(view)).not.toContain('Client A');
    });

    it('answers the same NOT_FOUND for a wrong, malformed, expired or revoked token', async () => {
      const payment = await makePayment();
      const good = (await issuePaymentLink(prisma, payment.id, 'http://app.test')).url.split('/pay/')[1]!;
      const expired = (await issuePaymentLink(prisma, payment.id, 'http://app.test', new Date('2020-01-01'))).url.split('/pay/')[1]!;
      const revoked = (await issuePaymentLink(prisma, payment.id, 'http://app.test')).url.split('/pay/')[1]!;
      await prisma.paymentLink.update({ where: { tokenHash: hashToken(revoked) }, data: { revokedAt: new Date() } });

      for (const token of ['x', 'A'.repeat(43), good.slice(0, -1) + (good.endsWith('A') ? 'B' : 'A'), expired, revoked, payment.id]) {
        expect(await codeOf(anonymous()('payLink.get', { token }))).toBe('NOT_FOUND');
        expect(await codeOf(anonymous()('payLink.checkout', { token }))).toBe('NOT_FOUND');
      }
      expect(await codeOf(anonymous()('payLink.get', { token: good }))).toBe('OK');
    });

    it('opens checkout with amount, currency and ids taken from the row, never from the caller', async () => {
      const payment = await makePayment({ amount: 250.5, totalWithFees: 250.5 });
      const token = (await issuePaymentLink(prisma, payment.id, 'http://app.test')).url.split('/pay/')[1]!;

      const result = (await anonymous()('payLink.checkout', { token, amount: 1, currency: 'usd', customer: 'cus_evil' })) as { url: string };

      expect(result.url).toMatch(/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_\d+$/);
      const { params, options } = stripeCalls[0]!;
      expect(params.mode).toBe('payment');
      expect(params.line_items[0].price_data).toMatchObject({ currency: 'eur', unit_amount: 25050 });
      expect(params.metadata).toEqual({ payment_id: payment.id, space_id: ids.space });
      expect(params.client_reference_id).toBe(payment.id);
      expect(params.success_url.startsWith('http://app.test/pay/')).toBe(true);
      expect(params.customer).toBeUndefined();
      expect(options.idempotencyKey).toContain(payment.id);
    });

    it('refuses checkout once the payment is paid, processing or waiting for confirmation', async () => {
      for (const status of ['PAID', 'PROCESSING', 'AWAITING_CONFIRMATION', 'CANCELLED']) {
        const payment = await makePayment({ status });
        const token = (await issuePaymentLink(prisma, payment.id, 'http://app.test')).url.split('/pay/')[1]!;
        expect(await codeOf(anonymous()('payLink.checkout', { token }))).toBe('BAD_REQUEST');
      }
    });
  });

  describe('client dashboard scoping', () => {
    it('lists only the caller own payments and refuses another client payment', async () => {
      const mine = await makePayment({ description: 'Mine' });
      const theirs = await makePayment({ clientId: ids.clientB, description: 'Theirs' });

      const listed = (await clientA()('portal.payments')) as Array<{ id: string }>;
      expect(listed.map((p) => p.id)).toContain(mine.id);
      expect(listed.map((p) => p.id)).not.toContain(theirs.id);

      expect(await codeOf(clientA()('portal.checkout', { paymentId: theirs.id }))).toBe('NOT_FOUND');
      expect(await codeOf(clientA()('portal.manageMaintenance', { paymentId: theirs.id }))).toBe('NOT_FOUND');
      expect(await codeOf(clientA()('portal.declarePayment', { paymentId: theirs.id, declaration: { method: 'TRANSFER' } }))).toBe('NOT_FOUND');
      expect(stripeCalls).toHaveLength(0);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: theirs.id } })).status).toBe('PENDING');
    });

    it('starts a subscription checkout for maintenance and opens the portal for a live one', async () => {
      const maintenance = await makePayment({ frequency: 'MONTHLY', amount: 49, totalWithFees: 49, description: 'Maintenance' });
      await clientA()('portal.checkout', { paymentId: maintenance.id });
      expect(stripeCalls[0]!.params.mode).toBe('subscription');
      expect(stripeCalls[0]!.params.customer).toBe('cus_new');
      expect(stripeCalls[0]!.params.line_items[0].price_data).toMatchObject({ unit_amount: 4900, recurring: { interval: 'month' } });
      expect(stripeCalls[0]!.params.subscription_data.metadata.payment_id).toBe(maintenance.id);

      await prisma.payment.update({ where: { id: maintenance.id }, data: { stripeSubscriptionId: 'sub_1', status: 'PAID' } });
      const portal = (await clientA()('portal.manageMaintenance', { paymentId: maintenance.id })) as { url: string };
      expect(portal.url).toBe('https://billing.stripe.com/p/session/x');
    });
  });

  describe('fees', () => {
    it('charges the client the invoice amount and nothing on top', async () => {
      const created = (await admin()('payment.create', {
        clientId: ids.clientA,
        amount: 100,
        description: 'No surcharge',
        collectionMethod: 'STRIPE',
        dueDate: new Date('2027-02-01'),
      })) as { amount: unknown; stripeFee: unknown; totalWithFees: unknown; id: string };

      expect(Number(created.amount)).toBe(100);
      expect(Number(created.stripeFee)).toBe(0);
      expect(Number(created.totalWithFees)).toBe(100);
      expect(mails).toHaveLength(1);
      const links = await prisma.paymentLink.count({ where: { paymentId: created.id } });
      expect(links).toBe(1);
    });
  });

  describe('webhook', () => {
    it('marks paid once, sends one receipt, and ignores a replay and a second event', async () => {
      const payment = await makePayment();
      const event = sessionEvent('evt_paid', 'checkout.session.completed', {
        mode: 'payment', payment_status: 'paid', amount_total: 10000, currency: 'eur',
        client_reference_id: payment.id, payment_intent: 'pi_1',
        metadata: { payment_id: payment.id, space_id: ids.space },
      });
      await deliver(event);
      await deliver(event);
      await deliver({ ...event, id: 'evt_paid_2' } as Stripe.Event);

      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row.status).toBe('PAID');
      expect(row.stripePaymentIntentId).toBe('pi_1');
      expect(receipts).toBe(1);
    });

    it('refuses a wrong amount, a wrong currency and a foreign space', async () => {
      const payment = await makePayment();
      const base = {
        mode: 'payment', payment_status: 'paid', amount_total: 10000, currency: 'eur',
        client_reference_id: payment.id, metadata: { payment_id: payment.id, space_id: ids.space },
      } as const;
      await deliver(sessionEvent('evt_a', 'checkout.session.completed', { ...base, amount_total: 100 }));
      await deliver(sessionEvent('evt_b', 'checkout.session.completed', { ...base, currency: 'usd' }));
      await deliver(sessionEvent('evt_c', 'checkout.session.completed', { ...base, metadata: { payment_id: payment.id, space_id: 'other' } }));
      await deliver(sessionEvent('evt_d', 'checkout.session.completed', { ...base, client_reference_id: 'someone-else' }));

      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
      expect(receipts).toBe(0);
    });

    it('follows a SEPA debit: processing, then paid, or back to pending on failure', async () => {
      const ok = await makePayment();
      const failing = await makePayment();
      const session = (payment: { id: string }, extra: Partial<Stripe.Checkout.Session> = {}) => ({
        mode: 'payment', payment_status: 'unpaid', amount_total: 10000, currency: 'eur',
        client_reference_id: payment.id, metadata: { payment_id: payment.id, space_id: ids.space }, ...extra,
      }) as Partial<Stripe.Checkout.Session>;

      await deliver(sessionEvent('evt_s1', 'checkout.session.completed', session(ok)));
      await deliver(sessionEvent('evt_s2', 'checkout.session.completed', session(failing)));
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: ok.id } })).status).toBe('PROCESSING');
      expect(receipts).toBe(0);

      await deliver(sessionEvent('evt_s3', 'checkout.session.async_payment_succeeded', session(ok, { payment_status: 'paid' })));
      await deliver(sessionEvent('evt_s4', 'checkout.session.async_payment_failed', session(failing)));
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: ok.id } })).status).toBe('PAID');
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: failing.id } })).status).toBe('PENDING');
      expect(receipts).toBe(1);
    });

    it('settles a maintenance subscription from the paid invoice, matching amount and currency', async () => {
      const payment = await makePayment({ frequency: 'MONTHLY', amount: 49, totalWithFees: 49 });
      const invoice = (id: string, paid: number, currency = 'eur') => ({
        id, type: 'invoice.payment_succeeded',
        data: { object: { id: `in_${id}`, currency, amount_paid: paid, amount_due: paid,
          parent: { subscription_details: { subscription: 'sub_m', metadata: { payment_id: payment.id } } } } },
      }) as unknown as Stripe.Event;

      await deliver(invoice('e1', 100));
      await deliver(invoice('e2', 4900, 'usd'));
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');

      await deliver(invoice('e3', 4900));
      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row.status).toBe('PAID');
      expect(row.stripeSubscriptionId).toBe('sub_m');
      expect(receipts).toBe(1);
    });
  });

  describe('paid another way', () => {
    it('waits for an admin, who confirms it as a manual payment', async () => {
      const payment = await makePayment();
      const token = (await issuePaymentLink(prisma, payment.id, 'http://app.test')).url.split('/pay/')[1]!;

      await anonymous()('payLink.declare', {
        token, declaration: { method: 'TRANSFER', reference: 'VIR-42', paidOn: new Date('2026-11-01') },
      });
      let row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row).toMatchObject({ status: 'AWAITING_CONFIRMATION', declaredMethod: 'TRANSFER', declaredReference: 'VIR-42', declaredVia: 'link' });
      expect(mails.map((m) => m.to)).toEqual([['admin@pay.test']]);

      const view = (await anonymous()('payLink.get', { token })) as { canPayOnline: boolean; declared: unknown };
      expect(view.canPayOnline).toBe(false);
      expect(view.declared).toMatchObject({ method: 'TRANSFER', reference: 'VIR-42' });
      expect(await codeOf(anonymous()('payLink.declare', { token, declaration: { method: 'CHEQUE' } }))).toBe('CONFLICT');

      expect(await codeOf(callerFor({ id: ids.outsider, role: 'MEMBER', email: 'out@pay.test' })('payment.confirmDeclared', { id: payment.id }))).toBe('NOT_FOUND');
      await admin()('payment.confirmDeclared', { id: payment.id });
      row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row).toMatchObject({ status: 'PAID', collectionMethod: 'MANUAL' });
      expect(row.paidAt?.toISOString().slice(0, 10)).toBe('2026-11-01');

      const trail = await prisma.auditLog.findMany({ where: { entityId: payment.id }, orderBy: { createdAt: 'asc' } });
      expect(trail.map((l) => (l.changes as any).event)).toEqual(['payment.declared', 'payment.declaration.confirmed']);
      expect(trail[0]!.userId).toBeNull();
      expect(trail[0]!.ipAddress).toBe('203.0.113.7');
      expect(trail[1]!.userId).toBe(ids.member);
    });

    it('goes back to pending when the admin rejects it, and logs why', async () => {
      const payment = await makePayment();
      await clientA()('portal.declarePayment', { paymentId: payment.id, declaration: { method: 'CHEQUE' } });
      expect(await codeOf(clientA()('portal.checkout', { paymentId: payment.id }))).toBe('BAD_REQUEST');

      await admin()('payment.rejectDeclared', { id: payment.id, reason: 'Nothing received' });
      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row).toMatchObject({ status: 'PENDING', declaredMethod: null });
      const trail = await prisma.auditLog.findMany({ where: { entityId: payment.id }, orderBy: { createdAt: 'asc' } });
      expect(trail.map((l) => (l.changes as any).event)).toEqual(['payment.declared', 'payment.declaration.rejected']);
      expect((trail[1]!.changes as any).reason).toBe('Nothing received');
      expect(trail[0]!.userId).toBe(ids.userA);
    });

    it('rejects a future date and an unknown method', async () => {
      const payment = await makePayment();
      const call = (declaration: unknown) => clientA()('portal.declarePayment', { paymentId: payment.id, declaration });
      expect(await codeOf(call({ method: 'BITCOIN' }))).toBe('BAD_REQUEST');
      expect(await codeOf(call({ method: 'TRANSFER', paidOn: new Date('2999-01-01') }))).toBe('BAD_REQUEST');
    });
  });

  describe('one live session per payment', () => {
    const tokenOf = async (paymentId: string) =>
      (await issuePaymentLink(prisma, paymentId, 'http://app.test')).url.split('/pay/')[1]!;

    it('expires the dashboard session when the emailed link starts another, so only one stays payable', async () => {
      const payment = await makePayment();
      const token = await tokenOf(payment.id);

      await clientA()('portal.checkout', { paymentId: payment.id });
      await anonymous()('payLink.checkout', { token });

      expect(stripeCalls).toHaveLength(2);
      expect(openSessions()).toHaveLength(1);
      expect(openSessions()[0]!.success_url).toContain('/pay/');
      expect(stripeCalls.every((call) => !call.options.idempotencyKey.includes(token))).toBe(true);
    });

    it('reuses the open session for the same surface instead of creating another', async () => {
      const payment = await makePayment();
      const first = (await clientA()('portal.checkout', { paymentId: payment.id })) as { url: string };
      const second = (await clientA()('portal.checkout', { paymentId: payment.id })) as { url: string };

      expect(second.url).toBe(first.url);
      expect(stripeCalls).toHaveLength(1);
    });

    it('creates a fresh session after the stored one expired, with a new idempotency key', async () => {
      const payment = await makePayment();
      await clientA()('portal.checkout', { paymentId: payment.id });
      sessions.get('cs_test_1').status = 'expired';
      const again = (await clientA()('portal.checkout', { paymentId: payment.id })) as { url: string };

      expect(again.url).toContain('cs_test_2');
      expect(stripeCalls[0]!.options.idempotencyKey).not.toBe(stripeCalls[1]!.options.idempotencyKey);
    });

    it('refuses a new session while the stored one is complete and waiting for the webhook', async () => {
      const payment = await makePayment();
      await clientA()('portal.checkout', { paymentId: payment.id });
      sessions.get('cs_test_1').status = 'complete';

      expect(await codeOf(clientA()('portal.checkout', { paymentId: payment.id }))).toBe('CONFLICT');
      expect(stripeCalls).toHaveLength(1);
    });

    it('expires the open session when an admin changes the amount', async () => {
      const payment = await makePayment();
      await clientA()('portal.checkout', { paymentId: payment.id });

      await admin()('payment.update', { id: payment.id, amount: 120 });

      expect(openSessions()).toHaveLength(0);
      await clientA()('portal.checkout', { paymentId: payment.id });
      expect(sessions.get('cs_test_2').amount_total).toBe(12000);
    });

    it('keeps the legacy ids and refuses checkout when the old intent cannot be cancelled', async () => {
      const payment = await makePayment({ stripePaymentIntentId: 'pi_legacy', stripeSubscriptionId: null });
      legacyCancelError = { code: 'payment_intent_unexpected_state' };

      expect(await codeOf(clientA()('portal.checkout', { paymentId: payment.id }))).toBe('CONFLICT');
      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row.stripePaymentIntentId).toBe('pi_legacy');
      expect(stripeCalls).toHaveLength(0);

      legacyCancelError = { code: 'resource_missing' };
      await clientA()('portal.checkout', { paymentId: payment.id });
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).stripePaymentIntentId).toBeNull();
    });
  });

  describe('money that needs a human', () => {
    const paidSession = (payment: { id: string }, extra: Partial<Stripe.Checkout.Session> = {}) =>
      ({
        mode: 'payment', payment_status: 'paid', amount_total: 10000, currency: 'eur',
        client_reference_id: payment.id, metadata: { payment_id: payment.id, space_id: ids.space },
        payment_intent: 'pi_second', ...extra,
      }) as Partial<Stripe.Checkout.Session>;

    it('flags and emails a second payment for an invoice already paid', async () => {
      const payment = await makePayment({ status: 'PAID', stripePaymentIntentId: 'pi_first' });
      await deliver(sessionEvent('evt_dup', 'checkout.session.completed', paidSession(payment)));

      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row.needsAttention).toBe('DUPLICATE_PAYMENT');
      expect(row.attentionAt).not.toBeNull();
      expect(mails.map((m) => m.to)).toEqual([['admin@pay.test']]);
      expect(receipts).toBe(0);
    });

    it('does not flag the second event of the same payment', async () => {
      const payment = await makePayment();
      await deliver(sessionEvent('evt_x1', 'checkout.session.completed', paidSession(payment, { payment_intent: 'pi_one' })));
      await deliver(sessionEvent('evt_x2', 'checkout.session.async_payment_succeeded', paidSession(payment, { payment_intent: 'pi_one' })));

      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).needsAttention).toBeNull();
      expect(receipts).toBe(1);
    });

    it('cancels a duplicate subscription at once and flags the payment', async () => {
      const payment = await makePayment({ frequency: 'MONTHLY', amount: 49, totalWithFees: 49, status: 'PAID', stripeSubscriptionId: 'sub_first' });
      await deliver(
        sessionEvent('evt_sub2', 'checkout.session.completed', {
          mode: 'subscription', payment_status: 'paid', amount_total: 4900, currency: 'eur',
          client_reference_id: payment.id, metadata: { payment_id: payment.id, space_id: ids.space },
          subscription: 'sub_second',
        } as never)
      );

      expect(cancelled).toEqual(['sub_second']);
      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row.needsAttention).toBe('DUPLICATE_SUBSCRIPTION');
      expect(row.stripeSubscriptionId).toBe('sub_first');
      expect(mails).toHaveLength(1);
    });

    it('persists an amount mismatch instead of only logging it', async () => {
      const payment = await makePayment();
      await deliver(sessionEvent('evt_mm', 'checkout.session.completed', paidSession(payment, { amount_total: 100 })));

      const row = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(row).toMatchObject({ status: 'PENDING', needsAttention: 'AMOUNT_MISMATCH' });
    });

    it('flags a refund and a dispute, and an admin can dismiss the flag', async () => {
      const payment = await makePayment({ status: 'PAID', stripePaymentIntentId: 'pi_r' });
      await deliver({ id: 'evt_ref', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_r' } } } as never);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).needsAttention).toBe('REFUNDED');

      await deliver({ id: 'evt_dis', type: 'charge.dispute.created', data: { object: { id: 'dp_1', payment_intent: 'pi_r' } } } as never);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).needsAttention).toBe('DISPUTED');

      await admin()('payment.dismissAttention', { id: payment.id });
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).needsAttention).toBeNull();
    });
  });

  describe('links and rejection', () => {
    it('revokes the pay links once the payment is paid', async () => {
      const payment = await makePayment();
      const token = (await issuePaymentLink(prisma, payment.id, 'http://app.test')).url.split('/pay/')[1]!;
      await deliver(
        sessionEvent('evt_rv', 'checkout.session.completed', {
          mode: 'payment', payment_status: 'paid', amount_total: 10000, currency: 'eur',
          client_reference_id: payment.id, payment_intent: 'pi_rv',
          metadata: { payment_id: payment.id, space_id: ids.space },
        })
      );

      expect(await codeOf(anonymous()('payLink.get', { token }))).toBe('NOT_FOUND');
    });

    it('puts a rejected declaration back to its original status', async () => {
      const payment = await makePayment({ status: 'PAST_DUE', dueDate: new Date('2027-06-01') });
      await clientA()('portal.declarePayment', { paymentId: payment.id, declaration: { method: 'TRANSFER' } });
      await admin()('payment.rejectDeclared', { id: payment.id });

      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PAST_DUE');
    });
  });

  describe('open payments in flight', () => {
    it('reports on a dry run and links and mails every open payment when applied', async () => {
      await prisma.payment.deleteMany({});
      const pending = await makePayment();
      const overdue = await makePayment({ status: 'PAST_DUE' });
      await makePayment({ status: 'PAID' });
      await makePayment({ status: 'PAST_DUE', stripeSubscriptionId: 'sub_live', frequency: 'MONTHLY' });

      const dry = await sendOpenPaymentLinks(prisma, smtp as never, 'http://app.test', { apply: false });
      expect(dry).toMatchObject({ considered: 3, sent: 2 });
      expect(await prisma.paymentLink.count()).toBe(0);

      const applied = await sendOpenPaymentLinks(prisma, smtp as never, 'http://app.test', { apply: true });
      expect(applied.sent).toBe(2);
      expect(await prisma.paymentLink.count({ where: { paymentId: { in: [pending.id, overdue.id] } } })).toBe(2);
      expect(mails).toHaveLength(2);
    });
  });
});
