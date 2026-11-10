/**
 * TypeScript port of github.com/FacileStudio/porte/directory@v0.1.0, the
 * client every Facile app uses to keep its shared spaces equal to Registre's.
 *
 * Registre owns spaces, members and roles. The app pulls the whole snapshot
 * (at boot, every five minutes, and two seconds after a nudge) and applies it
 * idempotently, so a lost, repeated or reordered nudge costs nothing.
 */

import { StaleRevisionError } from '@repo/trpc/billing';

/** Registre's three ranks, lowest to highest. */
export const RoleMember = 'member';
export const RoleAdmin = 'admin';
export const RoleOwner = 'owner';

/** The route Registre posts its empty nudge to, fixed across the suite. */
export const SyncPath = '/api/registre/sync';

/** How often a Syncer pulls without being nudged. */
export const DefaultInterval = 5 * 60 * 1000;

/** The shortest gap a burst of nudges collapses into before one pull. */
const debounce = 2 * 1000;

/** One person in a space, keyed by their Registre `sub`. */
export interface DirectoryMember {
  sub: string;
  email: string;
  name: string;
  picture: string;
  role: string;
  email_verified?: boolean;
}

/** One shared space; `id` is Registre's and survives renames. */
export interface DirectorySpace {
  id: string;
  name: string;
  members: DirectoryMember[];
  entitlements?: Record<string, unknown>;
}

/** One person's personal entitlements, as Registre last received them from Ardoise. */
export interface DirectoryPerson {
  sub: string;
  entitlements?: Record<string, unknown>;
}

/** Every shared space as Registre holds it now; `version` rises on every change. */
export interface Snapshot {
  version: number;
  spaces: DirectorySpace[];
  people?: DirectoryPerson[];
}

/** One person Registre erased, as its deletions listing names them. */
export interface DeletedPerson {
  sub: string;
  deleted_at: string;
}

/** One page of Registre's deletions listing; `nextCursor` is set when another page follows. */
export interface DeletionPage {
  deleted: DeletedPerson[];
  nextCursor?: string;
}

/** The largest directory response read, so a broken peer cannot exhaust memory. */
const MaxResponseBytes = 16 * 1024 * 1024;

/** The largest error body read from a write answer. */
const MaxErrorBytes = 64 * 1024;

/** Reads a response body as text, failing once it passes `limit` bytes. */
async function readCapped(response: Response, limit: number): Promise<string> {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > limit) {
    await response.body?.cancel().catch(() => {});
    throw new DirectoryUnavailableError('response too large');
  }
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      throw new DirectoryUnavailableError('response too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}



/** One person an app already had in a space before Registre owned spaces. */
export interface ImportMember {
  sub?: string;
  email?: string;
  role: string;
}

/** One shared space an app held before Registre owned spaces. */
export interface ImportSpace {
  name: string;
  members: ImportMember[];
}

/** Wraps every failure to reach Registre or read its answer. */
export class DirectoryUnavailableError extends Error {
  constructor(message: string) {
    super(`directory: registre unavailable: ${message}`);
    this.name = 'DirectoryUnavailableError';
  }
}

/** What a Syncer needs from a client, so tests can fake Registre. */
export interface SnapshotSource {
  snapshot(): Promise<Snapshot>;
}

/**
 * Talks to Registre's directory API with the app's own OIDC client
 * credentials over HTTP Basic, exactly like the Go client.
 */
export class DirectoryClient implements SnapshotSource {
  constructor(
    private readonly issuer: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly timeoutMs = 10_000
  ) {}

  /** Fetches every shared space as Registre holds it now. */
  snapshot(): Promise<Snapshot> {
    return this.call('GET', '/api/directory/snapshot');
  }

  /**
   * Hands Registre this app's pre-existing shared spaces. Registre merges them
   * by name, keeps the highest role, and remembers the import, so a second
   * call is a no-op answering the current snapshot.
   */
  import(spaces: ImportSpace[]): Promise<Snapshot> {
    return this.call('POST', '/api/directory/import', JSON.stringify({ spaces }));
  }

  /**
   * Replaces every entitlement Registre holds with `body` (PUT
   * /api/directory/entitlements). A 409 throws StaleRevisionError with
   * the revision Registre holds; any other non-204 answer throws
   * DirectoryUnavailableError.
   */
  async putEntitlements(body: { revision: number }): Promise<void> {
    const response = await this.send('PUT', '/api/directory/entitlements', JSON.stringify(body));
    if (response.status === 204 || response.status === 200) {
      await response.body?.cancel().catch(() => {});
      return;
    }
    if (response.status === 409) {
      const text = await readCapped(response, MaxErrorBytes).catch(() => '');
      let current = Number.NaN;
      try {
        current = Number((JSON.parse(text) as { current?: unknown }).current);
      } catch {
        current = Number.NaN;
      }
      if (Number.isSafeInteger(current) && current >= 0) throw new StaleRevisionError(current);
    }
    await response.body?.cancel().catch(() => {});
    throw new DirectoryUnavailableError(`/api/directory/entitlements answered ${response.status}`);
  }

  /**
   * Lists one page of the people Registre erased in its sixty-day window
   * (GET /api/directory/deletions), resuming after `cursor` when given.
   */
  async deletions(cursor?: string): Promise<DeletionPage> {
    const path = `/api/directory/deletions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`;
    const response = await this.send('GET', path);
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => {});
      throw new DirectoryUnavailableError(`/api/directory/deletions answered ${response.status}`);
    }
    let page: { deleted?: unknown; next_cursor?: unknown };
    try {
      page = JSON.parse(await readCapped(response, MaxResponseBytes));
    } catch (error) {
      if (error instanceof DirectoryUnavailableError) throw error;
      throw new DirectoryUnavailableError(`decode the deletions: ${String(error)}`);
    }
    if (!Array.isArray(page.deleted)) throw new DirectoryUnavailableError('the deletions carry no list');
    const deleted = page.deleted.filter(
      (row): row is DeletedPerson => typeof row?.sub === 'string' && row.sub.trim() !== ''
    );
    return typeof page.next_cursor === 'string' && page.next_cursor
      ? { deleted, nextCursor: page.next_cursor }
      : { deleted };
  }

  /** Sends one authenticated request with the timeout. */
  private async send(method: string, path: string, body?: string): Promise<Response> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    try {
      return await fetch(`${this.issuer.replace(/\/$/, '')}${path}`, {
        method,
        body,
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: 'error',
      });
    } catch (error) {
      throw new DirectoryUnavailableError(error instanceof Error ? error.message : String(error));
    }
  }

  /** Sends one authenticated request and decodes the snapshot it answers. */
  private async call(method: string, path: string, body?: string): Promise<Snapshot> {
    const response = await this.send(method, path, body);
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => {});
      throw new DirectoryUnavailableError(`${path} answered ${response.status}`);
    }
    try {
      const snapshot = JSON.parse(await readCapped(response, MaxResponseBytes)) as Partial<Snapshot>;
      return {
        version: Number(snapshot.version ?? 0),
        spaces: snapshot.spaces ?? [],
        ...(Array.isArray(snapshot.people) ? { people: snapshot.people } : {}),
      };
    } catch (error) {
      if (error instanceof DirectoryUnavailableError) throw error;
      throw new DirectoryUnavailableError(`decode the snapshot: ${String(error)}`);
    }
  }
}

/** Minimal logger shape, satisfied by the app's pino logger. */
export interface SyncLogger {
  warn(object: unknown, message?: string): void;
}

/**
 * Keeps the app's spaces equal to Registre's. `apply` must be idempotent:
 * it runs again whenever anything may have changed. Pulls are serialised, a
 * burst of nudges collapses into one pull two seconds after the first, and a
 * snapshot whose version was already applied is skipped.
 */
export class Syncer {
  private applied = 0;
  private queue: Promise<void> = Promise.resolve();
  private nudgeTimer: ReturnType<typeof setTimeout> | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly source: SnapshotSource,
    private readonly apply: (snapshot: Snapshot) => Promise<void>,
    private readonly logger: SyncLogger,
    private readonly interval = DefaultInterval
  ) {}

  /** Pulls once now, then on every interval tick and after every nudge. */
  run(): Promise<void> {
    this.ticker ??= setInterval(() => void this.pull(), this.interval);
    return this.pull();
  }

  /** Stops the interval and any pending nudge. */
  stop(): void {
    if (this.ticker) clearInterval(this.ticker);
    if (this.nudgeTimer) clearTimeout(this.nudgeTimer);
    this.ticker = null;
    this.nudgeTimer = null;
  }

  /**
   * Schedules a pull; nudges arriving while one is pending collapse into it.
   * A nudge before `run` is dropped, because `run` pulls first anyway and the
   * caller may still be importing.
   */
  nudge(): void {
    if (!this.ticker || this.nudgeTimer) return;
    this.nudgeTimer = setTimeout(() => {
      this.nudgeTimer = null;
      void this.pull();
    }, debounce);
  }

  /** Pulls and applies once, skipping a version already applied. */
  async sync(): Promise<void> {
    const snapshot = await this.source.snapshot();
    if (snapshot.version !== 0 && snapshot.version === this.applied) return;
    await this.apply(snapshot);
    this.applied = snapshot.version;
  }

  /** Queues one sync behind any running one and logs its failure. */
  private pull(): Promise<void> {
    this.queue = this.queue.then(() =>
      this.sync().catch((error) =>
        this.logger.warn({ error }, '[REGISTRE] Directory sync failed, keeping the last applied spaces')
      )
    );
    return this.queue;
  }
}
