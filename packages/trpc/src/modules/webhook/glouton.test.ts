import { afterEach, describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { verifySignature } from '@repo/glouton';
import { emitClientToGlouton, emitMissionToGlouton, gloutonCompanyLink } from './glouton';

const env = {
  FRONTEND_URL: 'https://ardoise.test',
  GLOUTON_URL: 'https://glouton.test',
  GLOUTON_API_TOKEN: 'token',
  GLOUTON_WEBHOOK_SECRET: 's'.repeat(16),
};
const log = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } as any;
const original = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = original;
});

function capture() {
  const sent: { body: string; headers: Record<string, string> }[] = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    sent.push({ body: String(init.body), headers: init.headers as Record<string, string> });
    return new Response(null, { status: 202 });
  }) as unknown as typeof fetch;
  return sent;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

const db = {
  mission: {
    findUnique: async () => ({ id: 'm1', name: 'Site vitrine', clientId: 'c1' }),
  },
  client: {
    findUnique: async () => ({
      id: 'c1',
      gloutonCompanyId: 'g1',
      companyName: 'Acme',
      contactFirstName: 'Ada',
      contactLastName: 'Lovelace',
      contactEmail: 'ada@acme.test',
      billingAddress: null,
      billingCity: null,
      billingPostalCode: null,
      billingCountry: null,
      siret: '12345678901234',
      tvaIntracom: null,
      updatedAt: new Date('2026-11-03T12:00:00Z'),
      space: { registreSpaceId: 'space-r' },
    }),
  },
} as unknown as PrismaClient;

describe('glouton emits', () => {
  it('sends a signed mission event with cents and the document number', async () => {
    const sent = capture();
    emitMissionToGlouton({ db, log, env }, 'mission.invoice_generated', 'm1', {
      amount: '1200.50',
      documentNumber: 'F-2026-001',
    });
    await settle();

    expect(sent.length).toBe(1);
    expect(
      verifySignature(
        env.GLOUTON_WEBHOOK_SECRET,
        sent[0].body,
        sent[0].headers['X-Ardoise-Signature-256']
      )
    ).toBe(true);
    expect(JSON.parse(sent[0].body).data).toEqual({
      clientId: 'c1',
      missionId: 'm1',
      missionTitle: 'Site vitrine',
      amountCents: 120050,
      currency: 'EUR',
      documentNumber: 'F-2026-001',
      url: 'https://ardoise.test/admin/missions/m1',
    });
  });

  it('sends the client payload with its registre space', async () => {
    const sent = capture();
    emitClientToGlouton({ db, log, env }, 'client.updated', 'c1');
    await settle();

    expect(JSON.parse(sent[0].body)).toMatchObject({
      event: 'client.updated',
      data: { id: 'c1', gloutonCompanyId: 'g1', registreSpaceId: 'space-r' },
    });
  });

  it('stays silent and links nothing when Glouton is not configured', async () => {
    const sent = capture();
    emitClientToGlouton({ db, log, env: {} }, 'client.created', 'c1');
    await settle();

    expect(sent.length).toBe(0);
    expect(gloutonCompanyLink({}, 'g1')).toBeNull();
    expect(gloutonCompanyLink(env, 'g1')).toBe('https://glouton.test/app/contacts/companies/g1');
  });
});
