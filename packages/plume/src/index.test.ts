import { describe, expect, test } from 'bun:test';
import {
  contractExternalRef,
  documentIdFromExternalRef,
  getSigners,
  parseSignatureEvent,
  plumeConfigFromEnv,
  safeHttpUrl,
  sendForSignature,
  signContractWebhook,
  signingUrlFor,
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

describe('client link', () => {
  test('sends the client so Plume files the document under it', async () => {
    let sent: Record<string, unknown> = {};
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init: { body: FormData }) => {
      sent = JSON.parse(String(init.body.get('request')));
      return Response.json({ document: { id: 7 } });
    }) as unknown as typeof fetch;
    try {
      await sendForSignature(
        { url: 'https://plume.test', token: 't', webhookSecret: 'x'.repeat(16) },
        {
          name: 'Contract',
          filename: 'c.pdf',
          pdf: new Uint8Array([37, 80, 68, 70]),
          signers: [{ name: 'Ada', email: 'ada@example.com' }],
          externalRef: 'ardoise:contract:1',
          client: { name: 'Ada Martin', email: 'ada@example.com', company: 'Acme' },
        }
      );
    } finally {
      globalThis.fetch = original;
    }
    expect(sent.client).toEqual({ name: 'Ada Martin', email: 'ada@example.com', company: 'Acme' });
  });
});

describe('signing links', () => {
  const config = { url: 'https://plume.test', token: 't', webhookSecret: 'x'.repeat(16) };

  test('sendForSignature returns each signer with its signing url', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      Response.json({
        document: { id: 7 },
        signers: [
          { id: 1, name: 'Ada', email: 'Ada@Example.com', signing_url: 'https://p.test/share/a' },
          { id: 2, name: 'Bob', email: 'bob@example.com', signing_url: 'https://p.test/share/b' },
        ],
      })) as unknown as typeof fetch;
    try {
      const sent = await sendForSignature(config, {
        name: 'C',
        filename: 'c.pdf',
        pdf: new Uint8Array([37]),
        signers: [{ name: 'Ada', email: 'ada@example.com' }],
        externalRef: 'ardoise:contract:1',
      });
      expect(signingUrlFor(sent.signers, 'ada@example.com')).toBe('https://p.test/share/a');
      expect(signingUrlFor(sent.signers, 'nobody@example.com')).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });

  test('only https or local http signing links survive', () => {
    const list = ['javascript:alert(1)', 'http://evil.test/x', 'http://localhost:3000/x', 'https://p.test/x'];
    expect(list.map((url) => safeHttpUrl(url))).toEqual([
      null,
      null,
      'http://localhost:3000/x',
      'https://p.test/x',
    ]);
  });

  test('getSigners looks the document up by external ref', async () => {
    const original = globalThis.fetch;
    let called = '';
    globalThis.fetch = (async (url: string) => {
      called = url;
      return Response.json({ signers: [{ id: 3, email: 'a@b.c', status: 'pending', signing_url: 'https://p.test/u' }] });
    }) as unknown as typeof fetch;
    try {
      const signers = await getSigners(config, 'ardoise:contract:57');
      expect(called).toBe(
        'https://plume.test/api/documents/lookup?external_ref=ardoise%3Acontract%3A57'
      );
      expect(signers[0]).toMatchObject({ email: 'a@b.c', signingUrl: 'https://p.test/u', status: 'pending' });
    } finally {
      globalThis.fetch = original;
    }
  });
});
