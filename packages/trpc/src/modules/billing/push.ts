import type { Prisma, PrismaClient } from '@repo/database';
import { resolveEntitlements, type Resolution } from './resolve';
import { loadResolveInput, sameEntitlements, type DirectorySource, type DirectoryView } from './state';
import type { Entitlements } from './values';

/** The body of Registre's PUT /api/directory/entitlements. */
export interface EntitlementsPush {
  revision: number;
  spaces: { id: string; entitlements: Entitlements }[];
  people: { sub: string; email: string; entitlements: Entitlements }[];
}

/** Registre refused the revision; `current` is the one it holds. */
export class StaleRevisionError extends Error {
  constructor(readonly current: number) {
    super(`stale revision, registre holds ${current}`);
    this.name = 'StaleRevisionError';
  }
}

/** Registre's directory API as the pusher needs it. */
export interface EntitlementsRemote extends DirectorySource {
  putEntitlements(body: EntitlementsPush): Promise<void>;
}

/** Minimal logger shape, satisfied by pino. */
export interface PushLogger {
  info(object: unknown, message?: string): void;
  warn(object: unknown, message?: string): void;
}

/** What one push attempt did. */
export type PushOutcome =
  | { status: 'pushed'; revision: number; unresolvedComps: string[] }
  | { status: 'unchanged'; unresolvedComps: string[] }
  | { status: 'failed'; error: string };

const STATE_ID = 'singleton';

/** The push body for a resolution, without its revision. */
export function toPushBody(resolution: Resolution, revision: number): EntitlementsPush {
  return {
    revision,
    spaces: resolution.spaces.map(({ id, entitlements }) => ({ id, entitlements })),
    people: resolution.people.map(({ sub, email, entitlements }) => ({ sub, email, entitlements })),
  };
}

/** Whether Registre's snapshot already carries exactly these entitlements. */
export function alreadyApplied(directory: DirectoryView, resolution: Resolution): boolean {
  if (!directory.people) return false;
  const spaces = new Map(directory.spaces.map((space) => [space.id, space.entitlements]));
  const people = new Map(directory.people.map((person) => [person.sub, person.entitlements]));
  if (people.size !== resolution.people.length) return false;
  return (
    resolution.spaces.every((space) => sameEntitlements(space.entitlements, spaces.get(space.id))) &&
    resolution.people.every((person) => sameEntitlements(person.entitlements, people.get(person.sub)))
  );
}

/** A short, secret-free description of a push failure. */
function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

/**
 * Computes every space and person entitlement and pushes them to Registre
 * with a monotonic revision. Pushes are serialised; a burst of requests
 * collapses into one push. A 409 adopts Registre's revision + 1 and retries
 * once. Failures are logged and stored in EntitlementPushState.lastError,
 * never thrown to the caller.
 */
export class EntitlementPusher {
  private queue: Promise<unknown> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly db: PrismaClient,
    private readonly remote: EntitlementsRemote,
    private readonly logger: PushLogger,
    private readonly debounceMs = 2_000
  ) {}

  /** Pushes now, then on every interval tick. */
  start(intervalMs: number): Promise<PushOutcome> {
    this.ticker ??= setInterval(() => void this.push(), intervalMs);
    this.ticker.unref?.();
    return this.push();
  }

  /** Stops the interval and any pending request. */
  stop(): void {
    if (this.ticker) clearInterval(this.ticker);
    if (this.timer) clearTimeout(this.timer);
    this.ticker = null;
    this.timer = null;
  }

  /** Schedules a push; requests arriving while one is pending collapse into it. */
  request(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.push();
    }, this.debounceMs);
    this.timer.unref?.();
  }

  /** Queues one push behind any running one. */
  push(): Promise<PushOutcome> {
    const next = this.queue.then(() => this.pushOnce());
    this.queue = next.catch(() => {});
    return next;
  }

  private async pushOnce(): Promise<PushOutcome> {
    try {
      return await this.db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PUSH_LOCK_KEY})`;
          return this.pushLocked(tx);
        },
        { maxWait: LOCK_WAIT_MS, timeout: LOCK_WAIT_MS }
      );
    } catch (error) {
      const message = describe(error);
      this.logger.warn({ error: message }, '[BILLING] Entitlement push failed');
      await this.record({ lastError: message }).catch(() => {});
      return { status: 'failed', error: message };
    }
  }

  /** Computes and sends one push while holding the cluster-wide push lock. */
  private async pushLocked(tx: Tx): Promise<PushOutcome> {
    const directory = await this.remote.snapshot();
    const { input, unresolvedComps } = await loadResolveInput(tx as PrismaClient, directory);
    if (unresolvedComps.length > 0) {
      this.logger.warn({ count: unresolvedComps.length }, '[BILLING] Comped people missing from the Registre snapshot');
    }
    const resolution = resolveEntitlements(input);
    if (alreadyApplied(directory, resolution)) {
      await this.record({ lastError: null }, tx);
      return { status: 'unchanged', unresolvedComps };
    }
    let revision = await allocateRevision(tx);
    try {
      await this.remote.putEntitlements(toPushBody(resolution, revision));
    } catch (error) {
      if (!(error instanceof StaleRevisionError)) throw error;
      revision = await allocateRevision(tx, error.current + 1);
      await this.remote.putEntitlements(toPushBody(resolution, revision));
    }
    await this.record({ lastPushedAt: new Date(), lastError: null }, tx);
    this.logger.info(
      { revision, spaces: resolution.spaces.length, people: resolution.people.length },
      '[BILLING] Entitlements pushed'
    );
    return { status: 'pushed', revision, unresolvedComps };
  }

  private async record(data: { lastPushedAt?: Date; lastError: string | null }, db: Tx | PrismaClient = this.db) {
    await db.entitlementPushState.upsert({
      where: { id: STATE_ID },
      create: { id: STATE_ID, ...data },
      update: data,
    });
  }
}

type Tx = Prisma.TransactionClient;

/** The pg advisory lock every Ardoise instance takes before pushing, so pushes never overlap. */
const PUSH_LOCK_KEY = 724_300_117;

/** How long a push may wait for the lock and hold it (snapshot, compute, two PUTs). */
const LOCK_WAIT_MS = 60_000;

/**
 * Bumps the stored revision in one statement and returns it: the next
 * revision, or exactly `next` when Registre told us where it stands.
 */
async function allocateRevision(tx: Tx, next?: number): Promise<number> {
  const rows = next === undefined
    ? await tx.$queryRaw<{ revision: number }[]>`
        INSERT INTO "EntitlementPushState" ("id", "revision", "updatedAt")
        VALUES (${STATE_ID}, 1, NOW())
        ON CONFLICT ("id") DO UPDATE SET "revision" = "EntitlementPushState"."revision" + 1, "updatedAt" = NOW()
        RETURNING "revision"`
    : await tx.$queryRaw<{ revision: number }[]>`
        INSERT INTO "EntitlementPushState" ("id", "revision", "updatedAt")
        VALUES (${STATE_ID}, ${next}, NOW())
        ON CONFLICT ("id") DO UPDATE SET "revision" = ${next}, "updatedAt" = NOW()
        RETURNING "revision"`;
  return Number(rows[0]!.revision);
}

let registered: EntitlementPusher | null = null;

/** Registers the process-wide pusher the triggers reach; null disables pushing. */
export function registerEntitlementPusher(pusher: EntitlementPusher | null): void {
  registered = pusher;
}

/** Asks the registered pusher for a push soon. A no-op when Registre is not configured. */
export function requestEntitlementPush(): void {
  registered?.request();
}

/** Pushes right away through the registered pusher, or reports that pushing is disabled. */
export async function pushEntitlementsNow(): Promise<PushOutcome> {
  if (!registered) return { status: 'failed', error: 'Registre is not configured' };
  return registered.push();
}
