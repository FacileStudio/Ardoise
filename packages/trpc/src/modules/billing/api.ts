import { createHash, timingSafeEqual } from 'node:crypto';
import type { Prisma, PrismaClient, SpaceSubscription } from '@repo/database';
import type Stripe from 'stripe';
import { z } from 'zod';
import { resolveEntitlements } from './resolve';
import { OWNER_ROLE, loadResolveInput, type DirectorySpaceView, type DirectoryView } from './state';
import { SPACE_METADATA_KEY, syncSubscriptionIn, type BillingLogger } from './webhook';

/** Printed on every Stripe invoice of a customer Ardoise creates: the micro-entreprise is exempt from VAT. */
export const VAT_EXEMPT_FOOTER = 'Yann THEVENIN EI · SIRET 924 415 714 00022 · TVA non applicable, art. 293 B du CGI';

/** The shortest BILLING_API_TOKEN accepted; anything shorter disables the billing routes. */
export const MIN_TOKEN_LENGTH = 32;

/** A billing API failure with a generic, caller-safe message. */
export class BillingApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 503,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'BillingApiError';
  }
}

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/** A short, stable digest of request parameters, so an idempotency key changes when they do. */
export function digest(...parts: (string | number)[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}

/**
 * Builds the bearer check for BILLING_API_TOKEN, or null when the token is
 * missing or shorter than 32 characters (the routes are then disabled).
 * Only the SHA-256 digest is kept, and digests are compared in constant time.
 */
export function bearerVerifier(token: string | undefined): ((header: string | undefined) => boolean) | null {
  if (!token || token.length < MIN_TOKEN_LENGTH) return null;
  const expected = sha256(token);
  return (header) => {
    if (!header?.startsWith('Bearer ')) return false;
    return timingSafeEqual(sha256(header.slice('Bearer '.length)), expected);
  };
}

/** Parses BILLING_REDIRECT_ORIGINS into a set of exact https origins. */
export function parseRedirectOrigins(raw: string): Set<string> {
  const out = new Set<string>();
  for (const entry of raw.split(',')) {
    try {
      const url = new URL(entry.trim());
      if (url.protocol === 'https:') out.add(url.origin);
    } catch {
      continue;
    }
  }
  return out;
}

/** Whether a redirect URL is an absolute https URL on one of the allowed origins. */
export function redirectAllowed(origins: Set<string>, value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && origins.has(url.origin);
  } catch {
    return false;
  }
}

const spaceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
const urlSchema = z.string().max(2048);

/** POST /billing/checkout body; unknown fields are rejected. */
export const checkoutSchema = z
  .object({
    space_id: spaceIdSchema,
    space_name: z.string().trim().min(1).max(200),
    owner_email: z.email().max(320),
    lookup_key: z.string().regex(/^plan_[a-z0-9_]+_(month|year)$/).max(100),
    success_url: urlSchema,
    cancel_url: urlSchema,
  })
  .strict();

/** POST /billing/portal body; unknown fields are rejected. */
export const portalSchema = z
  .object({ space_id: spaceIdSchema, owner_email: z.email().max(320), return_url: urlSchema })
  .strict();

/** Validates a space id path parameter. */
export function parseSpaceId(value: string): string {
  const parsed = spaceIdSchema.safeParse(value);
  if (!parsed.success) throw new BillingApiError(400, 'invalid_space', 'Invalid space id');
  return parsed.data;
}

const CATALOG_TTL_MS = 60_000;

let catalogCache = new WeakMap<PrismaClient, { at: number; value: Promise<Catalog> }>();

/** The catalog shape served at GET /api/catalog. */
export type Catalog = Awaited<ReturnType<typeof loadCatalog>>;

/** The catalog, cached in memory for 60 seconds. A failed load is not cached. */
export function cachedCatalog(db: PrismaClient, now = Date.now()): Promise<Catalog> {
  const hit = catalogCache.get(db);
  if (hit && now - hit.at < CATALOG_TTL_MS) return hit.value;
  const value = loadCatalog(db);
  catalogCache.set(db, { at: now, value });
  value.catch(() => {
    if (catalogCache.get(db)?.value === value) catalogCache.delete(db);
  });
  return value;
}

/** Drops the cached catalog, so a publish shows up at once. */
export function invalidateCatalog(): void {
  catalogCache = new WeakMap();
}

/** The public catalog: every published plan version, its values and prices. */
export async function loadCatalog(db: PrismaClient) {
  const versions = await db.planVersion.findMany({
    where: { status: 'published' },
    include: {
      plan: true,
      prices: { orderBy: { interval: 'asc' } },
      features: { include: { feature: { select: { key: true } } } },
    },
    orderBy: [{ plan: { sortOrder: 'asc' } }, { plan: { key: 'asc' } }],
  });
  return {
    plans: versions.map((version) => ({
      key: version.plan.key,
      name: version.plan.name,
      features: Object.fromEntries(version.features.map((row) => [row.feature.key, row.value])),
      prices: version.prices.map((price) => ({
        interval: price.interval,
        amount: price.amount,
        currency: price.currency,
        lookup_key: price.lookupKey,
      })),
    })),
  };
}

function findSpace(directory: DirectoryView, spaceId: string) {
  const space = directory.spaces.find((candidate) => candidate.id === spaceId);
  if (!space) throw new BillingApiError(404, 'unknown_space', 'Unknown space');
  return space;
}

/** GET /billing/spaces/:spaceId: the space's plan, status and resolved entitlements. */
export async function spaceStatus(db: PrismaClient, directory: DirectoryView, spaceId: string) {
  const space = findSpace(directory, spaceId);
  const { input } = await loadResolveInput(db, { version: directory.version, spaces: [space] });
  const resolved = resolveEntitlements({ ...input, people: [] }).spaces[0]!;
  const row = await db.spaceSubscription.findUnique({ where: { registreSpaceId: spaceId } });
  return {
    plan: resolved.plan,
    status: resolved.status,
    current_period_end: row?.currentPeriodEnd?.toISOString() ?? null,
    comped: resolved.comped,
    entitlements: resolved.entitlements,
  };
}

/** What checkout and portal need beyond the request. */
export interface BillingDeps {
  db: PrismaClient;
  stripe: Stripe;
  directory: DirectoryView;
  redirectOrigins: Set<string>;
  logger?: BillingLogger;
}

function requireRedirect(origins: Set<string>, value: string) {
  if (!redirectAllowed(origins, value)) {
    throw new BillingApiError(400, 'invalid_redirect', 'Redirect URL not allowed');
  }
}

/** Resolves a lookup key to the Stripe price of a currently published plan version. */
async function publishedPrice(db: PrismaClient, lookupKey: string) {
  const price = await db.planPrice.findFirst({
    where: { lookupKey, stripePriceId: { not: null }, version: { status: 'published' } },
  });
  if (!price?.stripePriceId) throw new BillingApiError(400, 'unknown_price', 'Unknown or unavailable plan');
  return price.stripePriceId;
}

/** Subscription statuses after which a space may check out again. */
const ENDED = new Set(['canceled', 'incomplete_expired']);

/** How long a checkout session stays open; Stripe's minimum. */
const CHECKOUT_TTL_S = 30 * 60;

type Tx = Prisma.TransactionClient;

const alreadySubscribed = () =>
  new BillingApiError(409, 'already_subscribed', 'This space already has a subscription');

type CheckoutGate = { row: SpaceSubscription | null; blocked: boolean };

/**
 * Refuses a second checkout while the space has a subscription that has not
 * ended (incomplete and unpaid included) or its last checkout session is
 * still open. A session that completed is synced first, so a subscription
 * whose webhook has not arrived yet still blocks the next checkout. The sync
 * reuses the checkout transaction, so one checkout holds one connection; a
 * refusal that must keep the sync is returned as `blocked`, thrown after commit.
 */
async function assertCanCheckOut(deps: BillingDeps, tx: Tx, spaceId: string): Promise<CheckoutGate> {
  const row = await tx.spaceSubscription.findUnique({ where: { registreSpaceId: spaceId } });
  if (row?.stripeSubscriptionId && !ENDED.has(row.status)) throw alreadySubscribed();
  if (!row?.checkoutSessionId) return { row, blocked: false };
  const session = await deps.stripe.checkout.sessions.retrieve(row.checkoutSessionId);
  if (session.status === 'open') {
    throw new BillingApiError(409, 'checkout_open', 'A checkout is already open for this space');
  }
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (session.status === 'complete' && subscriptionId) {
    const subscription = await deps.stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscriptionIn(tx, deps.stripe, subscription, deps.logger ?? quiet);
    if (!ENDED.has(subscription.status)) return { row, blocked: true };
  }
  return { row, blocked: false };
}

const quiet = { info() {}, warn() {}, error() {} };

/** Fails unless `email` is an owner of the snapshot space. */
function requireOwner(space: DirectorySpaceView, email: string) {
  const wanted = email.toLowerCase();
  if (!space.members.some((m) => m.role === OWNER_ROLE && m.email.toLowerCase() === wanted)) {
    throw new BillingApiError(403, 'not_owner', 'Only an owner of the space can do this');
  }
}

/** The space's Stripe customer, created once with registre_space_id metadata. */
async function customerFor(tx: Tx, stripe: Stripe, spaceId: string, name: string, email: string, stored: string | null) {
  if (stored) return stored;
  const customer = await stripe.customers.create(
    { name, email, invoice_settings: { footer: VAT_EXEMPT_FOOTER }, metadata: { [SPACE_METADATA_KEY]: spaceId } },
    { idempotencyKey: `ardoise_customer_${spaceId}_${digest(name, email, VAT_EXEMPT_FOOTER)}` }
  );
  await tx.spaceSubscription.upsert({
    where: { registreSpaceId: spaceId },
    create: { registreSpaceId: spaceId, stripeCustomerId: customer.id },
    update: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/**
 * POST /billing/checkout. The price comes only from a lookup key of a
 * published version; the space must exist in the Registre snapshot and
 * owner_email must be one of its owners. Checkouts of one space are
 * serialised by a Postgres advisory lock, and a space with a live
 * subscription or an open session cannot start another.
 */
export async function createCheckout(deps: BillingDeps, body: unknown) {
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) throw new BillingApiError(400, 'invalid_body', 'Invalid request body');
  const input = parsed.data;
  requireRedirect(deps.redirectOrigins, input.success_url);
  requireRedirect(deps.redirectOrigins, input.cancel_url);
  const space = findSpace(deps.directory, input.space_id);
  const email = input.owner_email.toLowerCase();
  requireOwner(space, email);
  const price = await publishedPrice(deps.db, input.lookup_key);
  const result = await deps.db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ardoise.checkout:${space.id}`}))`;
      const { row, blocked } = await assertCanCheckOut(deps, tx, space.id);
      if (blocked) return null;
      const customer = await customerFor(tx, deps.stripe, space.id, input.space_name, email, row?.stripeCustomerId ?? null);
      const metadata = { [SPACE_METADATA_KEY]: space.id };
      const expiresAt = Math.floor(Date.now() / 1000) + CHECKOUT_TTL_S;
      const session = await deps.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer,
        line_items: [{ price, quantity: 1 }],
        success_url: input.success_url,
        cancel_url: input.cancel_url,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        expires_at: expiresAt,
        metadata,
        subscription_data: { metadata },
      });
      if (!session.url) throw new BillingApiError(503, 'stripe_unavailable', 'Checkout unavailable');
      await tx.spaceSubscription.update({
        where: { registreSpaceId: space.id },
        data: { checkoutSessionId: session.id, checkoutExpiresAt: new Date(expiresAt * 1000) },
      });
      return { url: session.url };
    },
    { maxWait: 30_000, timeout: 60_000 }
  );
  if (!result) throw alreadySubscribed();
  return result;
}

/** POST /billing/portal: a Stripe billing portal session for a space that has a customer, opened by one of its owners. */
export async function createPortal(deps: BillingDeps, body: unknown) {
  const parsed = portalSchema.safeParse(body);
  if (!parsed.success) throw new BillingApiError(400, 'invalid_body', 'Invalid request body');
  requireRedirect(deps.redirectOrigins, parsed.data.return_url);
  const space = findSpace(deps.directory, parsed.data.space_id);
  requireOwner(space, parsed.data.owner_email);
  const row = await deps.db.spaceSubscription.findUnique({ where: { registreSpaceId: space.id } });
  if (!row?.stripeCustomerId) throw new BillingApiError(404, 'no_customer', 'This space has no billing account');
  const session = await deps.stripe.billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: parsed.data.return_url,
  });
  return { url: session.url };
}
