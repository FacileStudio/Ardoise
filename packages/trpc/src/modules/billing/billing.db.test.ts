import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { lockTestDatabase } from '@repo/database/test-lock';
import { prisma } from '@repo/database';
import type Stripe from 'stripe';
import { billingRouter } from './router';
import { createCheckout, createPortal, cachedCatalog, digest, invalidateCatalog, spaceStatus } from './api';
import { EntitlementPusher, StaleRevisionError, type EntitlementsPush } from './push';
import { seedBilling } from './seed';
import { adminRouter } from '../admin/router';
import { loadResolveInput } from './state';
import { resolveEntitlements } from './resolve';
import { migrateSubscribers, publishVersion } from './stripe-sync';
import { handleBillingEvent, reconcileSubscriptions, syncSubscription } from './webhook';
import type { DirectoryView } from './state';

/**
 * Run with DATABASE_URL and TEST_DATABASE_URL pointing at a throwaway,
 * fully migrated database: these tests truncate every billing table.
 */
const enabled = !!process.env.TEST_DATABASE_URL;
const silent = { info() {}, warn() {}, error() {}, debug() {} };

const directory: DirectoryView = {
  version: 3,
  spaces: [
    {
      id: 'spc_facile',
      members: [
        { sub: 'sub_yann', email: 'Yann@facile.studio', role: 'owner' },
        { sub: 'sub_guest', email: 'guest@client.fr', role: 'member' },
      ],
    },
    {
      id: 'spc_client',
      members: [
        { sub: 'sub_client', email: 'boss@client.fr', role: 'owner' },
        { sub: 'sub_guest', email: 'guest@client.fr', role: 'admin' },
      ],
    },
  ],
};

interface Call {
  method: string;
  args: unknown[];
}

function fakeStripe(subscriptions: Record<string, Partial<Stripe.Subscription>> = {}, customers: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const prices = new Map<string, any>();
  const sessions = new Map<string, { status: string }>();
  let next = 0;
  const record = (method: string, result: (...args: any[]) => unknown) =>
    async (...args: any[]) => {
      calls.push({ method, args });
      return result(...args);
    };
  const stripe = {
    products: {
      retrieve: record('products.retrieve', () => {
        throw Object.assign(new Error('No such product'), { statusCode: 404 });
      }),
      create: record('products.create', (params: any) => ({ id: params.id })),
      update: record('products.update', () => ({})),
    },
    prices: {
      create: record('prices.create', (params: any) => {
        const price = {
          id: `price_${++next}`,
          unit_amount: params.unit_amount,
          currency: params.currency,
          recurring: params.recurring,
          lookup_key: params.lookup_key,
          active: true,
        };
        prices.set(price.id, price);
        return price;
      }),
      retrieve: record('prices.retrieve', (id: string) => prices.get(id)),
      update: record('prices.update', (id: string, params: any) => Object.assign(prices.get(id) ?? {}, params)),
    },
    customers: {
      create: record('customers.create', () => ({ id: 'cus_new' })),
      retrieve: record('customers.retrieve', (id: string) => customers[id] ?? { id, deleted: true }),
    },
    subscriptions: {
      retrieve: record('subscriptions.retrieve', (id: string) => subscriptions[id]),
      list: (..._args: unknown[]) => Object.values(subscriptions),
    },
    checkout: {
      sessions: {
        create: record('checkout.create', () => {
          const id = `cs_${sessions.size + 1}`;
          sessions.set(id, { status: 'open' });
          return { id, url: `https://checkout.stripe.com/c/${id}` };
        }),
        retrieve: record('checkout.retrieve', (id: string) => sessions.get(id)),
      },
    },
  };
  return { stripe: stripe as unknown as Stripe, calls, prices, sessions };
}

const ISSUER = 'https://sso.example.test';

async function staffUser(email: string, sub: string) {
  await prisma.account.deleteMany({ where: { providerId: ISSUER, accountId: sub } });
  await prisma.user.deleteMany({ where: { email } });
  return prisma.user.create({
    data: {
      email,
      firstName: 'S',
      lastName: 'T',
      role: 'MEMBER',
      emailVerified: true,
      accounts: { create: { id: crypto.randomUUID(), providerId: ISSUER, accountId: sub } },
    },
  });
}

async function reset() {
  await prisma.duplicateSubscription.deleteMany();
  await prisma.compedSpace.deleteMany();
  await prisma.billingEvent.deleteMany();
  await prisma.entitlementPushState.deleteMany();
  await prisma.spaceSubscription.deleteMany();
  await prisma.entitlementOverride.deleteMany();
  await prisma.compedPerson.deleteMany();
  await prisma.planPrice.deleteMany();
  await prisma.planVersionFeature.deleteMany();
  await prisma.planVersion.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.feature.deleteMany();
  invalidateCatalog();
}

async function versionOf(planKey: string) {
  return prisma.planVersion.findFirstOrThrow({ where: { plan: { key: planKey } }, orderBy: { version: 'desc' } });
}

const subscription = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'sub_1',
    customer: 'cus_new',
    status: 'active',
    cancel_at_period_end: false,
    metadata: { registre_space_id: 'spc_client' },
    items: { data: [{ id: 'si_1', price: { id: 'price_1', recurring: { interval: 'month' } }, current_period_end: 1_900_000_000 }] },
    ...overrides,
  }) as unknown as Stripe.Subscription;

const event = (id: string, type: string, object: unknown) =>
  ({ id, type, created: 1_800_000_000, data: { object } }) as unknown as Stripe.Event;

describe.skipIf(!enabled)('billing against Postgres', () => {
  let release: () => Promise<void> = async () => {};
  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
  }, 600_000);
  afterAll(() => release());
  beforeEach(reset);

  it('seeds idempotently; comps grant only the personal scope of their Registre subject', async () => {
    expect(await seedBilling(prisma)).toEqual({ features: 6, plans: 3, versions: 3, comps: 4, subjects: 0 });
    expect(await seedBilling(prisma, 'yann@facile.studio=sub_yann,broken')).toEqual({
      features: 0, plans: 0, versions: 0, comps: 0, subjects: 1,
    });
    expect(await seedBilling(prisma, 'yann@facile.studio=sub_other')).toMatchObject({ subjects: 0 });
    expect(await prisma.planVersion.count({ where: { status: 'draft' } })).toBe(3);

    const { input } = await loadResolveInput(prisma, directory);
    const resolved = resolveEntitlements(input);
    const yann = resolved.people.find((p) => p.sub === 'sub_yann')!;
    expect(yann.entitlements['glouton.access']).toBe(true);
    expect(yann.entitlements['courrier.mailboxes']).toBe(-1);
    expect(resolved.people.find((p) => p.sub === 'sub_guest')!.entitlements['glouton.access']).toBe(false);

    const facile = await spaceStatus(prisma, directory, 'spc_facile');
    expect(facile).toMatchObject({ plan: 'solo', comped: false });
    expect(facile.entitlements['glouton.access']).toBe(false);
  });

  it('matches comps by subject or verified email only, never an unverified snapshot email', async () => {
    await seedBilling(prisma);
    const unverified = await loadResolveInput(prisma, directory);
    expect(unverified.input.comps).toEqual([]);
    expect(unverified.unresolvedComps.length).toBe(4);
    const verified: DirectoryView = {
      ...directory,
      spaces: [{ id: 'spc_x', members: [{ sub: 'sub_y', email: 'yann@facile.studio', role: 'member', email_verified: true }] }],
    };
    expect((await loadResolveInput(prisma, verified)).input.comps.map((c) => c.sub)).toEqual(['sub_y']);
  });

  it('comps a space only through an explicit, audited staff space comp', async () => {
    await seedBilling(prisma, 'noah@facile.studio=sub_noah');
    const coOwned: DirectoryView = {
      version: 1,
      spaces: [{ id: 'spc_attack', members: [
        { sub: 'sub_attacker', email: 'a@evil.fr', role: 'owner' },
        { sub: 'sub_noah', email: 'noah@facile.studio', role: 'owner' },
      ] }],
    };
    expect(await spaceStatus(prisma, coOwned, 'spc_attack')).toMatchObject({ plan: 'solo', comped: false });

    const staff = await staffUser('staff@facile.studio', 'sub_staff');
    const caller = billingRouter.createCaller({
      db: prisma,
      user: { id: staff.id, role: 'MEMBER', email: staff.email },
      env: { OIDC_ISSUER: ISSUER, BILLING_STAFF_SUBS: 'sub_staff' },
      log: silent,
    } as never);
    const comp = await caller.saveSpaceComp({ registreSpaceId: 'spc_attack', reason: 'partner', planKey: 'studio' });
    expect(await spaceStatus(prisma, coOwned, 'spc_attack')).toMatchObject({ plan: 'studio', comped: true });
    expect(await prisma.auditLog.count({ where: { userId: staff.id, entity: 'billing.spaceComp', entityId: comp.id } })).toBe(1);
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
  });

  it('refuses the admin engine to a non-staff member, so a rename never grants platform staff', async () => {
    const attacker = await staffUser('attacker@client.fr', 'sub_attacker');
    const ctx = {
      db: prisma,
      user: { id: attacker.id, role: 'MEMBER', email: attacker.email },
      env: { OIDC_ISSUER: ISSUER, BILLING_STAFF_SUBS: 'sub_camille', BILLING_STAFF_EMAILS: 'camille@facile.studio' },
      log: silent,
    } as never;
    const admin = adminRouter.createCaller(ctx);
    await expect(
      admin.update({ entity: 'user', id: attacker.id, data: { email: 'camille@facile.studio', emailVerified: true } })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(admin.update({ entity: 'user', id: attacker.id, data: { role: 'ADMIN' } })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      admin.create({ entity: 'user', data: { email: 'camille@facile.studio', firstName: 'C', lastName: 'C', role: 'ADMIN' } })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(admin.list({ entity: 'user' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: attacker.id } })).email).toBe('attacker@client.fr');

    await prisma.user.update({ where: { id: attacker.id }, data: { email: 'camille@facile.studio' } });
    await expect(billingRouter.createCaller(ctx).features()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(await billingRouter.createCaller(ctx).access()).toEqual({ staff: false });
    await prisma.user.delete({ where: { id: attacker.id } });
  });

  it('keeps drafts out of the catalog and out of checkout', async () => {
    await seedBilling(prisma);
    expect((await cachedCatalog(prisma)).plans).toEqual([]);
    const { stripe, calls } = fakeStripe();
    const body = {
      space_id: 'spc_client',
      space_name: 'Client',
      owner_email: 'boss@client.fr',
      lookup_key: 'plan_pro_month',
      success_url: 'https://sso.facile.studio/spaces/spc_client',
      cancel_url: 'https://sso.facile.studio/spaces/spc_client',
    };
    const deps = { db: prisma, stripe, directory, redirectOrigins: new Set(['https://sso.facile.studio']) };
    await expect(createCheckout(deps, body)).rejects.toMatchObject({ code: 'unknown_price' });
    expect(calls).toEqual([]);
  });

  it('publishes to Stripe with lookup keys and idempotency keys, then sells only published prices', async () => {
    await seedBilling(prisma);
    const draft = await versionOf('pro');
    const { stripe, calls } = fakeStripe();
    await publishVersion(prisma, stripe, draft.id);

    expect(calls.find((c) => c.method === 'products.create')!.args[0]).toMatchObject({ id: 'plan_pro' });
    const prices = calls.filter((c) => c.method === 'prices.create');
    expect(prices.map((c) => (c.args[0] as any).lookup_key).sort()).toEqual(['plan_pro_month', 'plan_pro_year']);
    expect(prices.every((c) => (c.args[0] as any).transfer_lookup_key === true)).toBe(true);
    expect(prices.every((c) => (c.args[1] as any).idempotencyKey.startsWith(`ardoise_publish_${draft.id}_`))).toBe(true);
    expect((await prisma.planVersion.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('published');

    const catalog = await cachedCatalog(prisma, Date.now() + 61_000);
    expect(catalog.plans.map((p) => p.key)).toEqual(['pro']);
    expect(catalog.plans[0]!.prices).toContainEqual({ interval: 'month', amount: 1200, currency: 'eur', lookup_key: 'plan_pro_month' });

    const deps = { db: prisma, stripe, directory, redirectOrigins: new Set(['https://sso.facile.studio']) };
    const body = {
      space_id: 'spc_client',
      space_name: 'Client',
      owner_email: 'BOSS@client.fr',
      lookup_key: 'plan_pro_month',
      success_url: 'https://sso.facile.studio/ok',
      cancel_url: 'https://sso.facile.studio/ko',
    };
    await expect(createCheckout(deps, { ...body, lookup_key: 'plan_studio_month' })).rejects.toMatchObject({ code: 'unknown_price' });
    await expect(createCheckout(deps, { ...body, owner_email: 'guest@client.fr' })).rejects.toMatchObject({ code: 'not_owner' });
    await expect(createCheckout(deps, { ...body, space_id: 'spc_nope' })).rejects.toMatchObject({ code: 'unknown_space' });
    await expect(createCheckout(deps, { ...body, success_url: 'https://evil.example/ok' })).rejects.toMatchObject({ code: 'invalid_redirect' });
    await expect(createCheckout(deps, { ...body, amount: 1 })).rejects.toMatchObject({ code: 'invalid_body' });

    expect(await createCheckout(deps, body)).toEqual({ url: 'https://checkout.stripe.com/c/cs_1' });
    await expect(createCheckout(deps, body)).rejects.toMatchObject({ code: 'checkout_open' });
    const session = calls.find((c) => c.method === 'checkout.create')!.args[0] as any;
    expect(session).toMatchObject({
      mode: 'subscription',
      customer: 'cus_new',
      allow_promotion_codes: true,
      line_items: [{ price: 'price_1', quantity: 1 }],
      subscription_data: { metadata: { registre_space_id: 'spc_client' } },
    });
    expect(session.automatic_tax).toBeUndefined();
    const customer = calls.find((c) => c.method === 'customers.create')!.args as any[];
    expect(customer[0].metadata).toEqual({ registre_space_id: 'spc_client' });
    expect(customer[1].idempotencyKey).toBe(`ardoise_customer_spc_client_${digest('Client', 'boss@client.fr')}`);
  });

  it('refuses to edit a published version and archives the previous one on republish', async () => {
    await seedBilling(prisma);
    const { stripe, calls } = fakeStripe();
    const v1 = await versionOf('pro');
    await publishVersion(prisma, stripe, v1.id);
    await expect(publishVersion(prisma, stripe, v1.id)).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    const staff = await staffUser('yann@facile.studio', 'sub_yann');
    const caller = billingRouter.createCaller({
      db: prisma,
      user: { id: staff.id, role: 'MEMBER', email: staff.email },
      env: { OIDC_ISSUER: ISSUER, BILLING_STAFF_SUBS: 'sub_yann' },
      getStripe: async () => ({ client: stripe }),
      log: silent,
    } as never);
    await expect(
      caller.saveDraft({ id: v1.id, values: { 'glouton.access': false }, prices: { month: 1, year: 1 } })
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    const v2 = await caller.createDraft({ planId: v1.planId });
    expect(v2.version).toBe(2);
    await expect(
      caller.saveDraft({ id: v2.id, values: { 'glouton.access': 3 }, prices: { month: 1500, year: null } })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await caller.saveDraft({ id: v2.id, values: { 'nuage.storage_gb': 200, 'glouton.access': true }, prices: { month: 1500, year: null } });
    const preview = await caller.previewPublish({ id: v2.id });
    expect(preview.features).toContainEqual({ key: 'nuage.storage_gb', before: 100, after: 200 });
    expect(preview.prices).toEqual([
      { interval: 'month', before: 1200, after: 1500 },
      { interval: 'year', before: 12000, after: null },
    ]);
    await caller.publish({ id: v2.id });

    expect((await prisma.planVersion.findUniqueOrThrow({ where: { id: v1.id } })).status).toBe('archived');
    const archived = calls.filter((c) => c.method === 'prices.update').map((c) => c.args[0]);
    expect(archived.sort()).toEqual(['price_1', 'price_2']);
    const audits = await prisma.auditLog.findMany({ where: { userId: staff.id, entity: 'billing.planVersion' } });
    expect(audits.length).toBeGreaterThanOrEqual(3);
    expect((audits.at(-1)!.changes as any).before).toBeTruthy();
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
  });

  it('mirrors subscription events once, ignoring replays and foreign customers', async () => {
    await seedBilling(prisma);
    const { stripe: publisher } = fakeStripe();
    await publishVersion(prisma, publisher, (await versionOf('pro')).id);
    await prisma.spaceSubscription.create({ data: { registreSpaceId: 'spc_client', stripeCustomerId: 'cus_new' } });

    const { stripe, calls } = fakeStripe({ sub_1: subscription() });
    const created = event('evt_1', 'customer.subscription.created', subscription());
    await handleBillingEvent(prisma, stripe, created, silent);
    await handleBillingEvent(prisma, stripe, created, silent);
    expect(calls.filter((c) => c.method === 'subscriptions.retrieve').length).toBe(1);

    const row = await prisma.spaceSubscription.findUniqueOrThrow({ where: { registreSpaceId: 'spc_client' } });
    expect(row).toMatchObject({ status: 'active', stripeSubscriptionId: 'sub_1' });
    expect(row.planVersionId).toBe((await versionOf('pro')).id);
    expect((await spaceStatus(prisma, directory, 'spc_client')).entitlements['glouton.access']).toBe(true);

    const forged = fakeStripe({ sub_2: subscription({ id: 'sub_2', customer: 'cus_attacker' }) });
    await handleBillingEvent(prisma, forged.stripe, event('evt_2', 'customer.subscription.updated', subscription({ id: 'sub_2' })), silent);
    expect((await prisma.spaceSubscription.findUniqueOrThrow({ where: { registreSpaceId: 'spc_client' } })).stripeSubscriptionId).toBe('sub_1');

    const failing = fakeStripe({ sub_1: subscription({ status: 'past_due' }) });
    const invoice = { parent: { subscription_details: { subscription: 'sub_1', metadata: { registre_space_id: 'spc_client' } } } };
    await handleBillingEvent(prisma, failing.stripe, event('evt_3', 'invoice.payment_failed', invoice), silent);
    const pastDue = await prisma.spaceSubscription.findUniqueOrThrow({ where: { registreSpaceId: 'spc_client' } });
    expect(pastDue.status).toBe('past_due');
    expect(pastDue.pastDueSince?.getTime()).toBe(1_800_000_000_000);
  });

  it('reconciles a lost row only when the customer metadata names the same space', async () => {
    await seedBilling(prisma);
    const good = subscription();
    const bad = subscription({ id: 'sub_9', customer: 'cus_other', metadata: { registre_space_id: 'spc_facile' } });
    const { stripe } = fakeStripe(
      { sub_1: good, sub_9: bad },
      {
        cus_new: { id: 'cus_new', metadata: { registre_space_id: 'spc_client' } },
        cus_other: { id: 'cus_other', metadata: { registre_space_id: 'spc_client' } },
      }
    );
    expect(await reconcileSubscriptions(prisma, stripe, silent)).toEqual({ repaired: 1, skipped: 1 });
    expect(await prisma.spaceSubscription.count()).toBe(1);
  });

  it('pushes with a monotonic revision, adopts current+1 on 409 and skips unchanged state', async () => {
    await seedBilling(prisma, 'yann@facile.studio=sub_yann');
    const bodies: EntitlementsPush[] = [];
    let applied: EntitlementsPush | null = null;
    let stale = true;
    const remote = {
      snapshot: async (): Promise<DirectoryView> =>
        applied
          ? {
              ...directory,
              spaces: directory.spaces.map((s) => ({ ...s, entitlements: applied!.spaces.find((x) => x.id === s.id)!.entitlements })),
              people: applied.people.map((p) => ({ sub: p.sub, entitlements: p.entitlements })),
            }
          : directory,
      putEntitlements: async (body: EntitlementsPush) => {
        bodies.push(body);
        if (stale) {
          stale = false;
          throw new StaleRevisionError(41);
        }
        applied = body;
      },
    };
    const pusher = new EntitlementPusher(prisma, remote, silent);
    const first = await pusher.push();
    expect(first).toMatchObject({ status: 'pushed', revision: 42 });
    expect(bodies.map((b) => b.revision)).toEqual([1, 42]);
    const yann = bodies[1]!.people.find((p) => p.sub === 'sub_yann')!;
    expect(yann.entitlements['glouton.access']).toBe(true);
    expect(bodies[1]!.people.find((p) => p.sub === 'sub_guest')!.entitlements['glouton.access']).toBe(false);
    expect(await pusher.push()).toMatchObject({ status: 'unchanged' });

    await prisma.compedPerson.deleteMany({ where: { email: 'yann@facile.studio' } });
    expect(await pusher.push()).toMatchObject({ status: 'pushed', revision: 43 });
    expect((await prisma.entitlementPushState.findUniqueOrThrow({ where: { id: 'singleton' } })).revision).toBe(43);
  });

  it('never reuses a Stripe price whose amount changed while the draft was edited', async () => {
    await seedBilling(prisma);
    const staff = await staffUser('yann@facile.studio', 'sub_yann');
    const { stripe, calls } = fakeStripe();
    const caller = billingRouter.createCaller({
      db: prisma,
      user: { id: staff.id, role: 'MEMBER', email: staff.email },
      env: { OIDC_ISSUER: ISSUER, BILLING_STAFF_SUBS: 'sub_yann' },
      getStripe: async () => ({ client: stripe }),
      log: silent,
    } as never);
    const draft = await versionOf('pro');
    await prisma.planPrice.updateMany({ where: { versionId: draft.id, interval: 'month' }, data: { stripePriceId: 'price_stale' } });
    await caller.saveDraft({ id: draft.id, values: {}, prices: { month: 1500, year: 12000 } });
    const month = await prisma.planPrice.findFirstOrThrow({ where: { versionId: draft.id, interval: 'month' } });
    expect(month).toMatchObject({ amount: 1500, stripePriceId: null });

    const stale = await stripe.prices.create({ unit_amount: 1200, currency: 'eur', recurring: { interval: 'year' }, lookup_key: 'old' } as never);
    await prisma.planPrice.updateMany({ where: { versionId: draft.id, interval: 'year' }, data: { stripePriceId: stale.id } });
    const matching = await stripe.prices.create({ unit_amount: 1500, currency: 'eur', recurring: { interval: 'month' }, lookup_key: 'x' } as never);
    await prisma.planPrice.updateMany({ where: { versionId: draft.id, interval: 'month' }, data: { stripePriceId: matching.id } });
    calls.length = 0;
    await publishVersion(prisma, stripe, draft.id);

    const created = calls.filter((c) => c.method === 'prices.create').map((c) => c.args as any[]);
    expect(created.map(([params]) => [params.recurring.interval, params.unit_amount])).toEqual([['year', 12000]]);
    expect(created[0]![1].idempotencyKey).toBe(`ardoise_publish_${draft.id}_year_12000_eur`);
    const moved = calls.find((c) => c.method === 'prices.update' && c.args[0] === matching.id)!.args[1] as any;
    expect(moved).toMatchObject({ lookup_key: 'plan_pro_month', transfer_lookup_key: true });
    const rows = await prisma.planPrice.findMany({ where: { versionId: draft.id }, orderBy: { interval: 'asc' } });
    expect(rows.map((r) => r.stripePriceId)).toEqual([matching.id, 'price_3']);
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
  });

  it('keeps a failed billing event claimed and marked, and processes it on redelivery', async () => {
    await seedBilling(prisma);
    await prisma.spaceSubscription.create({ data: { registreSpaceId: 'spc_client', stripeCustomerId: 'cus_new' } });
    const broken = fakeStripe();
    (broken.stripe.subscriptions as any).retrieve = async () => {
      throw new Error('stripe down');
    };
    const created = event('evt_f', 'customer.subscription.created', subscription());
    await expect(handleBillingEvent(prisma, broken.stripe, created, silent)).rejects.toThrow('stripe down');
    const failed = await prisma.billingEvent.findUniqueOrThrow({ where: { stripeEventId: 'evt_f' } });
    expect(failed.processedAt).toBeNull();
    expect(failed.failedAt).not.toBeNull();
    expect(failed.lastError).toBe('stripe down');

    const { stripe } = fakeStripe({ sub_1: subscription() });
    await handleBillingEvent(prisma, stripe, created, silent);
    const done = await prisma.billingEvent.findUniqueOrThrow({ where: { stripeEventId: 'evt_f' } });
    expect(done.processedAt).not.toBeNull();
    expect(done.failedAt).toBeNull();
    expect((await prisma.spaceSubscription.findUniqueOrThrow({ where: { registreSpaceId: 'spc_client' } })).status).toBe('active');
  });

  it('allows one checkout per space at a time and none while a subscription has not ended', async () => {
    await seedBilling(prisma);
    const { stripe, sessions } = fakeStripe();
    await publishVersion(prisma, stripe, (await versionOf('pro')).id);
    const deps = { db: prisma, stripe, directory, redirectOrigins: new Set(['https://sso.facile.studio']) };
    const body = {
      space_id: 'spc_client',
      space_name: 'Client',
      owner_email: 'boss@client.fr',
      lookup_key: 'plan_pro_month',
      success_url: 'https://sso.facile.studio/ok',
      cancel_url: 'https://sso.facile.studio/ko',
    };
    const results = await Promise.allSettled([createCheckout(deps, body), createCheckout(deps, body)]);
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
    expect((results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({ code: 'checkout_open' });
    expect(sessions.size).toBe(1);

    sessions.get('cs_1')!.status = 'expired';
    expect(await createCheckout(deps, body)).toEqual({ url: 'https://checkout.stripe.com/c/cs_2' });
    sessions.get('cs_2')!.status = 'complete';

    for (const status of ['incomplete', 'unpaid', 'past_due', 'active']) {
      await prisma.spaceSubscription.update({ where: { registreSpaceId: 'spc_client' }, data: { stripeSubscriptionId: 'sub_1', status } });
      await expect(createCheckout(deps, body)).rejects.toMatchObject({ code: 'already_subscribed' });
    }
    await prisma.spaceSubscription.update({ where: { registreSpaceId: 'spc_client' }, data: { status: 'canceled' } });
    expect((await createCheckout(deps, body)).url).toContain('cs_3');
  });

  it('refuses a checkout after a completed session whose webhook has not arrived', async () => {
    await seedBilling(prisma);
    const live = subscription({ id: 'sub_live' });
    const { stripe, sessions } = fakeStripe(
      { sub_live: live },
      { cus_new: { id: 'cus_new', metadata: { registre_space_id: 'spc_client' } } }
    );
    await publishVersion(prisma, stripe, (await versionOf('pro')).id);
    const deps = { db: prisma, stripe, directory, redirectOrigins: new Set(['https://sso.facile.studio']), logger: silent };
    const body = {
      space_id: 'spc_client',
      space_name: 'Client',
      owner_email: 'boss@client.fr',
      lookup_key: 'plan_pro_month',
      success_url: 'https://sso.facile.studio/ok',
      cancel_url: 'https://sso.facile.studio/ko',
    };
    await createCheckout(deps, body);
    Object.assign(sessions.get('cs_1')!, { status: 'complete', subscription: 'sub_live' });
    await expect(createCheckout(deps, body)).rejects.toMatchObject({ code: 'already_subscribed' });
    const row = await prisma.spaceSubscription.findUniqueOrThrow({ where: { registreSpaceId: 'spc_client' } });
    expect(row).toMatchObject({ stripeSubscriptionId: 'sub_live', status: 'active' });
    expect(sessions.size).toBe(1);
  });

  it('syncs completed sessions inside the checkout transaction: more concurrent checkouts than pool connections finish', async () => {
    await seedBilling(prisma);
    const live = subscription({ id: 'sub_live' });
    const { stripe, sessions } = fakeStripe(
      { sub_live: live },
      { cus_new: { id: 'cus_new', metadata: { registre_space_id: 'spc_client' } } }
    );
    await publishVersion(prisma, stripe, (await versionOf('pro')).id);
    const deps = { db: prisma, stripe, directory, redirectOrigins: new Set(['https://sso.facile.studio']), logger: silent };
    const body = {
      space_id: 'spc_client',
      space_name: 'Client',
      owner_email: 'boss@client.fr',
      lookup_key: 'plan_pro_month',
      success_url: 'https://sso.facile.studio/ok',
      cancel_url: 'https://sso.facile.studio/ko',
    };
    await createCheckout(deps, body);
    Object.assign(sessions.get('cs_1')!, { status: 'complete', subscription: 'sub_live' });
    const outcome = await Promise.race([
      Promise.allSettled(Array.from({ length: 24 }, () => createCheckout(deps, body))),
      new Promise<'hung'>((resolve) => setTimeout(() => resolve('hung'), 20_000)),
    ]);
    expect(outcome).not.toBe('hung');
    for (const result of outcome as PromiseSettledResult<unknown>[]) {
      expect(result).toMatchObject({ status: 'rejected', reason: { code: 'already_subscribed' } });
    }
  }, 30_000);

  it('keeps at most one free plan under concurrent saves and refuses to unflag the only one', async () => {
    await seedBilling(prisma);
    const staff = await staffUser('staff@facile.studio', 'sub_staff');
    const caller = billingRouter.createCaller({
      db: prisma,
      user: { id: staff.id, role: 'ADMIN', email: staff.email },
      env: { OIDC_ISSUER: ISSUER, BILLING_STAFF_SUBS: 'sub_staff' },
      getStripe: async () => ({ client: fakeStripe().stripe }),
      log: silent,
    } as never);
    for (let run = 0; run < 5; run++) {
      const results = await Promise.allSettled([
        caller.savePlan({ key: 'pro', name: 'Pro', sortOrder: 0, isFree: true }),
        caller.savePlan({ key: 'studio', name: 'Studio', sortOrder: 1, isFree: true }),
      ]);
      expect(await prisma.plan.count({ where: { isFree: true } })).toBe(1);
      for (const result of results) {
        if (result.status === 'rejected') expect(result.reason).toMatchObject({ code: 'CONFLICT' });
      }
    }
    const free = await prisma.plan.findFirstOrThrow({ where: { isFree: true } });
    await expect(caller.savePlan({ key: free.key, name: free.name, sortOrder: free.sortOrder, isFree: false })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(await prisma.plan.count({ where: { isFree: true } })).toBe(1);
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
  });

  it('gives the free plan its published version only, the feature defaults when none is published', async () => {
    await seedBilling(prisma);
    await prisma.planVersion.updateMany({ data: { status: 'draft', publishedAt: null } });
    const free = await prisma.plan.findFirstOrThrow({ where: { isFree: true } });
    const features = await prisma.feature.findMany();
    const { input } = await loadResolveInput(prisma, directory);
    const out = resolveEntitlements(input).spaces.find((space) => space.id === 'spc_client')!;
    expect(out.plan).toBe(free.key);
    const storage = features.find((feature) => feature.key === 'nuage.storage_gb')!;
    expect(out.entitlements['nuage.storage_gb']).toBe(storage.defaultValue as number);
    await prisma.planVersion.updateMany({ where: { plan: { key: free.key } }, data: { status: 'published', publishedAt: new Date() } });
    const again = resolveEntitlements((await loadResolveInput(prisma, directory)).input).spaces.find((space) => space.id === 'spc_client')!;
    expect(again.entitlements['nuage.storage_gb']).toBe(5);
  });

  it('never overwrites a live subscription with a second one, flags it and promotes it once the first ends', async () => {
    await seedBilling(prisma);
    await prisma.spaceSubscription.create({ data: { registreSpaceId: 'spc_client', stripeCustomerId: 'cus_new' } });
    const first = subscription({ id: 'sub_a' });
    const second = subscription({ id: 'sub_b' });
    const { stripe } = fakeStripe({ sub_a: first, sub_b: second });
    const alerts: unknown[] = [];
    const logger = { ...silent, error: (o: unknown) => void alerts.push(o) };
    const results = await Promise.all([
      syncSubscription(prisma, stripe, first, logger),
      syncSubscription(prisma, stripe, second, logger),
      syncSubscription(prisma, stripe, second, logger),
    ]);
    expect(results.filter(Boolean).length).toBeGreaterThanOrEqual(1);
    const row = await prisma.spaceSubscription.findUniqueOrThrow({ where: { registreSpaceId: 'spc_client' } });
    const duplicates = await prisma.duplicateSubscription.findMany();
    expect(duplicates.length).toBe(1);
    expect([row.stripeSubscriptionId, duplicates[0]!.stripeSubscriptionId].sort()).toEqual(['sub_a', 'sub_b']);
    expect(alerts.length).toBe(1);

    const kept = row.stripeSubscriptionId!;
    const spare = duplicates[0]!.stripeSubscriptionId;
    await syncSubscription(prisma, stripe, subscription({ id: kept, status: 'canceled' }), logger);
    await syncSubscription(prisma, stripe, subscription({ id: spare }), logger);
    expect((await prisma.spaceSubscription.findUniqueOrThrow({ where: { registreSpaceId: 'spc_client' } })).stripeSubscriptionId).toBe(spare);
    expect(await prisma.duplicateSubscription.count()).toBe(0);
  });

  it('resolves comps and the free plan from published versions, not drafts', async () => {
    await seedBilling(prisma, 'yann@facile.studio=sub_yann');
    const { stripe } = fakeStripe();
    const staff = await staffUser('staff@facile.studio', 'sub_staff');
    const caller = billingRouter.createCaller({
      db: prisma,
      user: { id: staff.id, role: 'ADMIN', email: staff.email },
      env: { OIDC_ISSUER: ISSUER, BILLING_STAFF_SUBS: 'sub_staff' },
      getStripe: async () => ({ client: stripe }),
      log: silent,
    } as never);
    const studio = await versionOf('studio');
    await caller.publish({ id: studio.id });
    const studioDraft = await caller.createDraft({ planId: studio.planId });
    await caller.saveDraft({ id: studioDraft.id, values: { 'glouton.access': false, 'nuage.storage_gb': 1 }, prices: { month: 3900, year: 39000 } });

    const solo = await versionOf('solo');
    await caller.publish({ id: solo.id });
    const soloDraft = await caller.createDraft({ planId: solo.planId });
    await caller.saveDraft({ id: soloDraft.id, values: { 'nuage.storage_gb': 999 }, prices: { month: null, year: null } });
    await caller.savePlan({ key: 'pro', name: 'Pro', sortOrder: 0 });
    await caller.savePlan({ key: 'solo', name: 'Solo', sortOrder: 5 });

    const { input } = await loadResolveInput(prisma, directory);
    const out = resolveEntitlements(input);
    const yann = out.people.find((p) => p.sub === 'sub_yann')!;
    expect(yann.entitlements['glouton.access']).toBe(true);
    expect(yann.entitlements['nuage.storage_gb']).toBe(500);
    const free = out.spaces.find((space) => space.id === 'spc_client')!;
    expect(free.plan).toBe('solo');
    expect(free.entitlements['nuage.storage_gb']).toBe(5);

    await caller.savePlan({ key: 'pro', name: 'Pro', sortOrder: 0, isFree: true });
    expect(await prisma.plan.count({ where: { isFree: true } })).toBe(1);
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
  });

  it('archives the previous Stripe prices only after the publish commits, and survives an archive failure', async () => {
    await seedBilling(prisma);
    const { stripe, calls } = fakeStripe();
    const v1 = await versionOf('pro');
    await publishVersion(prisma, stripe, v1.id);
    const draft = await prisma.planVersion.create({
      data: {
        planId: v1.planId,
        version: 2,
        prices: { create: [{ interval: 'month', amount: 1500, lookupKey: 'plan_pro_month' }] },
      },
    });
    const seen: string[] = [];
    const update = stripe.prices.update.bind(stripe.prices);
    (stripe.prices as any).update = async (id: string, params: any, options: any) => {
      if (params.active === false) {
        seen.push((await prisma.planVersion.findUniqueOrThrow({ where: { id: draft.id } })).status);
        throw new Error('stripe down');
      }
      return update(id, params, options);
    };
    const result = await publishVersion(prisma, stripe, draft.id);
    expect(seen).toEqual(['published', 'published']);
    expect(result.archiveFailures.sort()).toEqual(['price_1', 'price_2']);
    expect((await prisma.planVersion.findUniqueOrThrow({ where: { id: v1.id } })).status).toBe('archived');
    expect(calls.filter((c) => c.method === 'prices.create').length).toBe(3);
  });

  it('puts the migration mode and target price in the idempotency key', async () => {
    await seedBilling(prisma);
    const { stripe, calls } = fakeStripe({
      sub_1: subscription({ items: { data: [{ id: 'si_1', price: { id: 'price_old', recurring: { interval: 'month' } } }] } }),
    });
    const v1 = await versionOf('pro');
    await prisma.spaceSubscription.create({
      data: { registreSpaceId: 'spc_client', stripeCustomerId: 'cus_new', stripeSubscriptionId: 'sub_1', status: 'active', planVersionId: v1.id },
    });
    const v2 = await prisma.planVersion.create({
      data: { planId: v1.planId, version: 2, prices: { create: [{ interval: 'month', amount: 1500, lookupKey: 'plan_pro_month' }] } },
    });
    await publishVersion(prisma, stripe, v2.id);
    (stripe.subscriptions as any).update = async (...args: unknown[]) => void calls.push({ method: 'subscriptions.update', args });
    await prisma.spaceSubscription.update({ where: { registreSpaceId: 'spc_client' }, data: { planVersionId: v1.id } });
    await migrateSubscribers(prisma, stripe, v1.planId, 'period_end', silent);
    await prisma.spaceSubscription.update({ where: { registreSpaceId: 'spc_client' }, data: { planVersionId: v1.id } });
    await migrateSubscribers(prisma, stripe, v1.planId, 'immediate', silent);
    const keys = calls.filter((c) => c.method === 'subscriptions.update').map((c) => (c.args[2] as any).idempotencyKey);
    expect(keys.length).toBe(2);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toContain('period_end');
    expect(keys[1]).toContain('immediate');
  });

  it('opens the portal only for an owner', async () => {
    await prisma.spaceSubscription.create({ data: { registreSpaceId: 'spc_client', stripeCustomerId: 'cus_new' } });
    const stripe = { billingPortal: { sessions: { create: async () => ({ url: 'https://billing.stripe.com/p/1' }) } } } as never;
    const deps = { db: prisma, stripe, directory, redirectOrigins: new Set(['https://sso.facile.studio']) };
    const base = { space_id: 'spc_client', return_url: 'https://sso.facile.studio/x' };
    await expect(createPortal(deps, base)).rejects.toMatchObject({ code: 'invalid_body' });
    await expect(createPortal(deps, { ...base, owner_email: 'guest@client.fr' })).rejects.toMatchObject({ code: 'not_owner' });
    expect(await createPortal(deps, { ...base, owner_email: 'BOSS@client.fr' })).toEqual({ url: 'https://billing.stripe.com/p/1' });
  });

  it('gives lookup keys back when a draft with Stripe prices is deleted', async () => {
    await seedBilling(prisma);
    const { stripe, calls } = fakeStripe();
    const staff = await staffUser('staff@facile.studio', 'sub_staff');
    const caller = billingRouter.createCaller({
      db: prisma,
      user: { id: staff.id, role: 'ADMIN', email: staff.email },
      env: { OIDC_ISSUER: ISSUER, BILLING_STAFF_SUBS: 'sub_staff' },
      getStripe: async () => ({ client: stripe }),
      log: silent,
    } as never);
    const v1 = await versionOf('pro');
    await caller.publish({ id: v1.id });
    const draft = await caller.createDraft({ planId: v1.planId });
    const orphan = await stripe.prices.create({ unit_amount: 1200, currency: 'eur', recurring: { interval: 'month' }, lookup_key: 'plan_pro_month' } as never);
    await prisma.planPrice.updateMany({ where: { versionId: draft.id, interval: 'month' }, data: { stripePriceId: orphan.id } });
    calls.length = 0;
    await caller.deleteDraft({ id: draft.id });
    const updates = calls.filter((c) => c.method === 'prices.update').map((c) => [c.args[0], c.args[1]]);
    expect(updates).toContainEqual(['price_1', { lookup_key: 'plan_pro_month', transfer_lookup_key: true }]);
    expect(updates).toContainEqual([orphan.id, { active: false }]);
    expect(await prisma.planVersion.count({ where: { id: draft.id } })).toBe(0);
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
  });

  it('answers CONFLICT, never a 500, when two drafts race; seeds safely from two boots at once', async () => {
    const seeds = await Promise.all([seedBilling(prisma), seedBilling(prisma), seedBilling(prisma)]);
    expect(seeds.reduce((sum, r) => sum + r.features, 0)).toBe(6);
    expect(await prisma.plan.count()).toBe(3);
    expect(await prisma.plan.count({ where: { isFree: true } })).toBe(1);

    const staff = await staffUser('staff@facile.studio', 'sub_staff');
    const caller = billingRouter.createCaller({
      db: prisma,
      user: { id: staff.id, role: 'ADMIN', email: staff.email },
      env: { OIDC_ISSUER: ISSUER, BILLING_STAFF_SUBS: 'sub_staff' },
      getStripe: async () => ({ client: fakeStripe().stripe }),
      log: silent,
    } as never);
    const v1 = await versionOf('pro');
    await caller.publish({ id: v1.id });
    const results = await Promise.allSettled([1, 2, 3, 4].map(() => caller.createDraft({ planId: v1.planId })));
    for (const result of results) {
      if (result.status === 'rejected') expect(result.reason).toMatchObject({ code: 'CONFLICT' });
    }
    expect(await prisma.planVersion.count({ where: { planId: v1.planId, status: 'draft' } })).toBe(1);
    await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
  });

  it('serialises concurrent pushes from two instances with distinct, increasing revisions', async () => {
    await seedBilling(prisma);
    let stored = 0;
    let inFlight = 0;
    let overlap = false;
    const seen: number[] = [];
    const registre = {
      snapshot: async () => {
        if (inFlight > 0) overlap = true;
        return directory;
      },
      putEntitlements: async (body: EntitlementsPush) => {
        inFlight += 1;
        if (inFlight > 1) overlap = true;
        await new Promise((resolve) => setTimeout(resolve, 30));
        inFlight -= 1;
        if (body.revision < stored) throw new StaleRevisionError(stored);
        stored = body.revision;
        seen.push(body.revision);
      },
    };
    const a = new EntitlementPusher(prisma, registre, silent);
    const b = new EntitlementPusher(prisma, registre, silent);
    const outcomes = await Promise.all([a.push(), b.push(), a.push(), b.push()]);
    expect(outcomes.every((o) => o.status === 'pushed')).toBe(true);
    expect(overlap).toBe(false);
    expect(seen).toEqual([1, 2, 3, 4]);
    expect((await prisma.entitlementPushState.findUniqueOrThrow({ where: { id: 'singleton' } })).revision).toBe(4);
  });

  it('records a push failure without throwing', async () => {
    const pusher = new EntitlementPusher(
      prisma,
      { snapshot: async () => directory, putEntitlements: async () => { throw new Error('/api/directory/entitlements answered 401'); } },
      silent
    );
    expect(await pusher.push()).toMatchObject({ status: 'failed' });
    expect((await prisma.entitlementPushState.findUniqueOrThrow({ where: { id: 'singleton' } })).lastError).toContain('401');
  });
});
