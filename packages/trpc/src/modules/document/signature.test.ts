import { afterEach, describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { documentRouter } from './router';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const PLUME_ENV = {
  PLUME_URL: 'https://plume.test',
  PLUME_API_TOKEN: 'token',
  PLUME_WEBHOOK_SECRET: 'a-long-enough-secret',
};

function stored(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc-1',
    type: 'contrat_prestation',
    name: 'contrat_prestation_C1.pdf',
    spaceId: null,
    missionId: 'mission-1',
    clientName: 'Acme',
    providerName: 'Studio',
    providerEmail: 'studio@test.fr',
    pdfUrl: 'http://api/storage/documents/doc-1.pdf',
    signatureStatus: 'none',
    ...overrides,
  };
}

function setup(document: Record<string, unknown>, env: Record<string, unknown> = PLUME_ENV) {
  const updates: any[] = [];
  const downloads: string[] = [];
  const db: any = {
    document: {
      findUnique: async () => document,
      update: async (args: any) => {
        updates.push(args.data);
        return { id: 'doc-1', ...args.data };
      },
    },
    mission: {
      findUnique: async () => ({
        client: { contactFirstName: 'Ada', contactLastName: 'Martin', contactEmail: 'ada@acme.fr' },
      }),
    },
    spaceMember: { findUnique: async () => ({ role: 'MEMBER' }) },
  };
  const ctx = {
    db: db as PrismaClient,
    user: { id: 'user-1', role: 'ADMIN', email: 'a@b.c' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    storage: {
      download: async (key: string) => {
        downloads.push(key);
        return new TextEncoder().encode('%PDF-stored');
      },
    },
    env,
  } as any;
  return { caller: documentRouter.createCaller(ctx), updates, downloads };
}

describe('document.sendForSignature', () => {
  it('refuses when Plume is not configured', async () => {
    const { caller } = setup(stored(), {});

    await expect(caller.sendForSignature({ id: 'doc-1' })).rejects.toThrow('not configured');
  });

  it('refuses a document that is not a contract', async () => {
    const { caller } = setup(stored({ type: 'devis' }));

    await expect(caller.sendForSignature({ id: 'doc-1' })).rejects.toThrow('Only contracts');
  });

  it('refuses a document already sent', async () => {
    const { caller } = setup(stored({ signatureStatus: 'sent' }));

    await expect(caller.sendForSignature({ id: 'doc-1' })).rejects.toThrow('already sent');
  });

  it('sends the stored pdf with the mission client and marks the document sent', async () => {
    const calls: any[] = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      const form = init.body as FormData;
      calls.push({ url, request: JSON.parse(String(form.get('request'))), file: form.get('file') });
      return new Response(JSON.stringify({ document: { id: 57 } }), { status: 201 });
    }) as unknown as typeof fetch;
    const { caller, updates, downloads } = setup(stored());

    await caller.sendForSignature({ id: 'doc-1' });

    expect(downloads).toEqual(['documents/doc-1.pdf']);
    expect(calls[0].url).toBe('https://plume.test/api/documents/signature-requests');
    expect(calls[0].request.external_ref).toBe('ardoise:contract:doc-1');
    expect(calls[0].request.signers.map((s: any) => s.email)).toEqual([
      'ada@acme.fr',
      'studio@test.fr',
    ]);
    expect(updates[0]).toMatchObject({ signatureStatus: 'sent', plumeDocumentId: '57' });
  });
});
