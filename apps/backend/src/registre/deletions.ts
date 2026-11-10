import type { Context } from 'hono';
import { decodeProtectedHeader, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { DeletionPage } from './directory';
import type { ErasureOutcome } from './erasure';

/**
 * How Ardoise learns of Registre erasures. `GET /api/directory/deletions` is
 * Registre's source of truth and Ardoise polls it; a signed push on
 * `DeletionsPath` is accepted too once Registre's ardoise client declares it
 * as its `deletion_uri`. Both paths call the same idempotent `erasePerson`,
 * and both count a person handled only once that call returned.
 */

/** The route Registre pushes its signed user.deleted event to, as in porte/directory. */
export const DeletionsPath = '/api/registre/deletions';

/** The `events` key of Registre's deletion notice. */
export const UserDeletedEvent = 'https://schemas.facile.studio/event/user-deleted';

/** How often Registre's deletions listing is polled. */
export const DeletionPollInterval = 10 * 60 * 1000;

const SecEventType = 'secevent+jwt';
const MaxNoticeBytes = 16 * 1024;

/** Erases one Registre subject and says whether Ardoise knew them. */
export type EraseSubject = (subject: string) => Promise<ErasureOutcome>;

/** The listing a poll reads, faked in tests. */
export interface DeletionSource {
  deletions(cursor?: string): Promise<DeletionPage>;
}

/** Minimal logger shape, satisfied by the app's pino logger. */
export interface DeletionLogger {
  info(object: unknown, message?: string): void;
  warn(object: unknown, message?: string): void;
}

/** What one poll did. A failed subject is listed again by the next poll. */
export interface PollResult {
  erased: number;
  unknown: number;
  failed: string[];
}

/**
 * Walks every page of Registre's deletions listing and erases each person.
 * One failure does not stop the others; the whole window is listed again on
 * every poll, so nothing depends on a saved cursor and an already erased
 * person costs one read.
 */
export async function pollDeletions(
  source: DeletionSource,
  erase: EraseSubject
): Promise<PollResult> {
  const result: PollResult = { erased: 0, unknown: 0, failed: [] };
  let cursor: string | undefined;
  do {
    const page = await source.deletions(cursor);
    for (const { sub } of page.deleted) {
      try {
        const outcome = await erase(sub);
        if (outcome.status === 'erased') result.erased++;
        else result.unknown++;
      } catch {
        result.failed.push(sub);
      }
    }
    cursor = page.nextCursor;
  } while (cursor);
  return result;
}

/** Polls now, then every `interval`, never two polls at once. Returns a stop function. */
export function startDeletionPolling(options: {
  source: DeletionSource;
  erase: EraseSubject;
  logger: DeletionLogger;
  interval?: number;
}): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await pollDeletions(options.source, options.erase);
      if (result.erased > 0 || result.failed.length > 0) {
        options.logger.info(
          { erased: result.erased, failed: result.failed.length },
          '[REGISTRE] Erasures applied'
        );
      }
      if (result.failed.length > 0)
        options.logger.warn({}, '[REGISTRE] Some erasures failed, retrying next poll');
    } catch (error) {
      options.logger.warn(
        { error: String(error) },
        '[REGISTRE] Deletion poll failed, retrying next poll'
      );
    } finally {
      running = false;
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), options.interval ?? DeletionPollInterval);
  timer.unref?.();
  return () => clearInterval(timer);
}

/** Where a pushed notice's signature is checked: the issuer's keys and its exact `iss`. */
export interface NoticeKeys {
  issuer: string;
  keys: JWTVerifyGetKey;
}

/** Thrown when the issuer's keys cannot be read; the push answers 503 so Registre retries. */
class KeysUnavailable extends Error {}

/** The JWS header `typ`, or null when the token is not a readable compact JWS. */
function headerType(token: string): unknown {
  try {
    return decodeProtectedHeader(token).typ;
  } catch {
    return null;
  }
}

/**
 * Verifies a pushed notice as SPEC §6 and porte/directory do: JWS `typ`
 * exactly `secevent+jwt`, RS256 against the issuer's JWKS, `iss`, `aud`
 * holding Ardoise's client id, a live `exp`, at most an hour of life, and the
 * user-deleted event. Returns the subject, or null for anything else. A body
 * that is not a `secevent+jwt` JWS is refused before any key is fetched.
 * Throws when the keys cannot be read (a network failure, a timeout, a non-200 or
 * malformed JWKS), which is a retry and never a verdict.
 */
export async function verifyNotice(
  token: string,
  loadKeys: () => Promise<NoticeKeys>,
  clientId: string
): Promise<string | null> {
  if (headerType(token) !== SecEventType) return null;
  const keys = await loadKeys().catch(() => {
    throw new KeysUnavailable();
  });
  try {
    const { payload } = await jwtVerify(token, keys.keys, {
      issuer: keys.issuer,
      audience: clientId,
      algorithms: ['RS256'],
      typ: SecEventType,
      requiredClaims: ['exp', 'iat', 'sub', 'events'],
      maxTokenAge: '1h',
      clockTolerance: 60,
    });
    const events = payload.events;
    if (!events || typeof events !== 'object' || !(UserDeletedEvent in events)) return null;
    return typeof payload.sub === 'string' && payload.sub.trim() ? payload.sub : null;
  } catch (error) {
    const unreadableKeys =
      error instanceof errors.JWKSTimeout ||
      error instanceof errors.JWKSInvalid ||
      !(error instanceof errors.JOSEError) ||
      error.constructor === errors.JOSEError;
    if (unreadableKeys) throw new KeysUnavailable();
    return null;
  }
}

/**
 * Accepts Registre's signed user.deleted push. Answers 400 to anything that
 * does not verify (an unsigned or wrongly signed body changes nothing), 503
 * when the issuer's keys cannot be read, 500 when the erasure failed, and 202
 * only once the person is anonymised or Ardoise provably never held them.
 * Every non-2xx is retried by Registre. A replay is harmless: the identity row
 * is gone after the first erasure, so it erases nothing more.
 */
export function createDeletionHandler(options: {
  clientId: string;
  keys: () => Promise<NoticeKeys>;
  erase: EraseSubject;
  logger: DeletionLogger;
}) {
  return async (c: Context) => {
    const body = await c.req.text();
    if (body.length === 0 || body.length > MaxNoticeBytes)
      return c.json({ error: 'invalid notice' }, 400);
    let subject: string | null;
    try {
      subject = await verifyNotice(body.trim(), options.keys, options.clientId);
    } catch {
      return c.json({ error: 'issuer keys unavailable' }, 503);
    }
    if (!subject) return c.json({ error: 'invalid notice' }, 400);
    try {
      const outcome = await options.erase(subject);
      options.logger.info({ status: outcome.status }, '[REGISTRE] Erasure notice handled');
      return c.json({ status: outcome.status }, 202);
    } catch (error) {
      options.logger.warn(
        { error: String(error) },
        '[REGISTRE] Erasure from a pushed notice failed'
      );
      return c.json({ error: 'erasure failed' }, 500);
    }
  };
}
