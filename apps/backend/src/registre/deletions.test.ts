import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import {
  DeletionsPath,
  UserDeletedEvent,
  createDeletionHandler,
  type NoticeKeys,
} from './deletions';

const issuer = 'https://sso.example.test';
const clientId = 'ardoise-test';
const silent = { info: () => {}, warn: () => {} };

const pair = await generateKeyPair('RS256');
const jwks = createLocalJWKSet({
  keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' }],
});
const notice = await new SignJWT({ events: { [UserDeletedEvent]: {} } })
  .setProtectedHeader({ alg: 'RS256', typ: 'secevent+jwt', kid: 'k1' })
  .setIssuer(issuer)
  .setAudience(clientId)
  .setSubject('sub-1')
  .setIssuedAt()
  .setExpirationTime('10m')
  .sign(pair.privateKey);

/** The push route with the given key loader and eraser. */
function app(keys: () => Promise<NoticeKeys>, erase: (subject: string) => Promise<never>) {
  const handler = createDeletionHandler({ clientId, keys, erase, logger: silent });
  return (body: string) =>
    new Hono().post(DeletionsPath, handler).request(DeletionsPath, { method: 'POST', body });
}

describe('createDeletionHandler', () => {
  const down = async (): Promise<NoticeKeys> => {
    throw new Error('registre unreachable');
  };
  const never = async (): Promise<never> => {
    throw new Error('erase must not run');
  };

  test('refuses a body that is not a secevent JWS with 400 even when the keys are unreachable', async () => {
    const deliver = app(down, never);
    for (const body of ['', 'garbage', 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.']) {
      expect((await deliver(body)).status).toBe(400);
    }
  });

  test('answers 503 to a well-formed notice while the keys are unreachable, so Registre retries', async () => {
    expect((await app(down, never)(notice)).status).toBe(503);
  });

  test('answers 500 when the erasure fails, never a success', async () => {
    const deliver = app(async () => ({ issuer, keys: jwks }), never);
    expect((await deliver(notice)).status).toBe(500);
  });
});
