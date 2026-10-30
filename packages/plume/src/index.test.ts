import { describe, expect, test } from 'bun:test';
import {
  contractExternalRef,
  documentIdFromExternalRef,
  parseSignatureEvent,
  plumeConfigFromEnv,
  signContractWebhook,
  verifyWebhookSignature,
} from './index';

const SECRET = 'a-long-enough-secret';

describe('webhook signature', () => {
  const body = '{"event_type":"document.completed"}';

  test('accepts a correct signature', () => {
    expect(verifyWebhookSignature(SECRET, body, signContractWebhook(SECRET, body))).toBe(true);
  });

  test('rejects missing, tampered, wrong-secret and wrong-length signatures', () => {
    const good = signContractWebhook(SECRET, body);
    expect(verifyWebhookSignature(SECRET, body, undefined)).toBe(false);
    expect(verifyWebhookSignature(SECRET, body + ' ', good)).toBe(false);
    expect(verifyWebhookSignature('other-secret-value-x', body, good)).toBe(false);
    expect(verifyWebhookSignature(SECRET, body, 'sha256=abc')).toBe(false);
  });
});

describe('external ref', () => {
  test('round-trips and rejects foreign refs', () => {
    expect(documentIdFromExternalRef(contractExternalRef('abc-1'))).toBe('abc-1');
    expect(documentIdFromExternalRef('ardoise:contract:abc:signed')).toBeNull();
    expect(documentIdFromExternalRef('other:contract:abc')).toBeNull();
  });
});

describe('signature payload', () => {
  test('maps the fields from the document object', () => {
    const event = parseSignatureEvent(
      JSON.stringify({
        event_type: 'document.archived',
        document: {
          id: 42,
          status: 'completed',
          external_ref: 'ardoise:contract:d1',
          nuage: { space_facile_id: 'fac_0123456789abcdef01234567', published: true },
        },
      })
    );
    expect(event).toEqual({
      eventType: 'document.archived',
      externalRef: 'ardoise:contract:d1',
      plumeDocumentId: '42',
      status: 'completed',
      nuagePublished: true,
    });
  });

  test('returns null on garbage or a missing ref', () => {
    expect(parseSignatureEvent('nope')).toBeNull();
    expect(parseSignatureEvent('{"event_type":"document.completed","document":{}}')).toBeNull();
  });
});

describe('config', () => {
  test('is null unless all three are set', () => {
    expect(plumeConfigFromEnv({ PLUME_URL: 'https://p.test' })).toBeNull();
    expect(
      plumeConfigFromEnv({
        PLUME_URL: 'https://p.test/',
        PLUME_API_TOKEN: 't',
        PLUME_WEBHOOK_SECRET: SECRET,
      })?.url
    ).toBe('https://p.test');
  });
});
