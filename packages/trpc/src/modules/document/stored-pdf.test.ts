import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import type { StorageService } from '@repo/storage';
import {
  escapeTypstString,
  formatItems,
  formatProviders,
  formatFeatures,
  formatPaymentProviders,
  injectVariables,
  storeDocumentPdf,
  buildDocumentPersistenceBase,
} from './service';
import { documentRouter } from './router';
import spaceService from '../space/service';

describe('Typst string escaping', () => {
  it('escapes quotes and backslashes so a value cannot end its string', () => {
    expect(escapeTypstString('Page "Contact" \\ accueil')).toBe('Page \\"Contact\\" \\\\ accueil');
  });

  it('escapes an item description and unit', () => {
    const code = formatItems([
      { description: 'Site "vitrine"', quantity: 2, unit: 'j"', price: 100 },
    ]);

    expect(code).toContain('description: "Site \\"vitrine\\""');
    expect(code).toContain('unit: "j\\""');
  });

  it('keeps a single provider, feature or payment provider an array', () => {
    const provider = formatProviders([
      { name: 'A', role: 'r', address: 'a', city: 'c', siret: 's', email: 'e', amount: 1 },
    ]);
    const feature = formatFeatures([{ title: 't', desc: 'd' }]);
    const payment = formatPaymentProviders([{ name: 'A', iban: 'i', bic: 'b', amount_to_pay: 1 }]);

    for (const code of [provider, feature, payment]) {
      expect(code.endsWith('),')).toBe(true);
    }
  });

  it('escapes a scalar variable but leaves the generated code alone', () => {
    const items = formatItems([{ description: 'a "b"', quantity: 1, unit: 'j', price: 1 }]);
    const out = injectVariables('#let n = "{{client_name}}"\n#let items = ({{items}})', {
      client_name: 'Acme "Corp"',
      items,
    });

    expect(out).toContain('#let n = "Acme \\"Corp\\""');
    expect(out).toContain('description: "a \\"b\\""');
    expect(out).not.toContain('\\\\"');
  });
});

describe('storeDocumentPdf', () => {
  const pdf = Buffer.from('%PDF-1.7 test');

  function storageSpy() {
    const uploads: Array<{ key: string; data: Buffer; type?: string }> = [];
    const storage = {
      upload: async (key: string, data: Buffer, type?: string) => {
        uploads.push({ key, data, type });
        return key;
      },
      getFileUrl: (key: string) => `http://api/storage/${key}`,
    } as unknown as StorageService;

    return { storage, uploads };
  }

  it('uploads the pdf under documents/<id>.pdf and returns its url and sha256', async () => {
    const { storage, uploads } = storageSpy();

    const stored = await storeDocumentPdf(storage, pdf);

    expect(uploads[0].key).toBe(`documents/${stored.id}.pdf`);
    expect(uploads[0].type).toBe('application/pdf');
    expect(stored.pdfUrl).toBe(`http://api/storage/documents/${stored.id}.pdf`);
    expect(stored.pdfHash).toHaveLength(64);
  });

  it('gives the persisted row the same id as the stored file', async () => {
    const { storage } = storageSpy();
    const stored = await storeDocumentPdf(storage, pdf);

    const db = {
      spaceMember: { findUnique: async () => ({ role: 'MEMBER' }) },
    } as unknown as PrismaClient;
    const scope = await spaceService.resolveScope(db, 'user-1', 'space-a');
    const base = buildDocumentPersistenceBase(
      {} as any,
      'prov-1',
      pdf.length,
      'user-1',
      {} as any,
      scope,
      null,
      stored
    );

    expect(base.id).toBe(stored.id);
    expect(base.pdfUrl).toBe(stored.pdfUrl);
  });
});

describe('document.download', () => {
  const row = {
    id: 'doc-1',
    name: 'facture.pdf',
    spaceId: 'space-a',
    pdfUrl: 'http://api/storage/documents/doc-1.pdf',
    createdAt: new Date('2026-10-01'),
  };

  const callerWith = (storage: unknown) =>
    documentRouter.createCaller({
      db: {
        document: { findUnique: async () => row },
        spaceMember: { findUnique: async () => ({ role: 'MEMBER' }), findMany: async () => [{ spaceId: 'space-a' }] },
      } as unknown as PrismaClient,
      user: { id: 'user-1', role: 'MEMBER', email: 'a@b.c' },
      log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
      storage,
      env: {},
    } as any);

  it('serves the stored pdf instead of rebuilding it', async () => {
    const asked: string[] = [];
    const storage = {
      download: async (key: string) => {
        asked.push(key);
        return new Uint8Array([37, 80, 68, 70]);
      },
    };

    const result = await callerWith(storage).download({ id: 'doc-1' });

    expect(asked).toEqual(['documents/doc-1.pdf']);
    expect(Buffer.from(result.pdf, 'base64').toString()).toBe('%PDF');
    expect(result.fileName).toBe('facture.pdf');
  });
});
