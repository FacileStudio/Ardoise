import { describe, expect, it } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPartyAndLegalData, generateDocument, generateTypstContent } from './service';
import { DEFAULT_VAT_EXEMPTION_MENTION, documentDefaults, SPACE_SETTINGS_DEFAULTS } from '../space/settings';

const hasTypst = spawnSync('typst', ['--version']).status === 0;
const EXTRACT = `
import sys
try:
    import pymupdf as fitz
    print("\\n".join(page.get_text() for page in fitz.open(sys.argv[1])))
except ImportError:
    import pypdf
    print("\\n".join(page.extract_text() for page in pypdf.PdfReader(sys.argv[1]).pages))
`;
const hasExtractor = spawnSync('python3', ['-c', EXTRACT.replace('sys.argv[1]', '"/nonexistent"')]).stderr
  .toString()
  .includes('ModuleNotFound') === false;

const provider = {
  name: 'Facile',
  siret: '92441571400022',
  address: '1 rue X',
  city: 'Paris',
  email: 'p@x.test',
  phone: '0102030405',
  bankName: 'Banque',
  iban: 'FR7612345678901234567890123',
  bic: 'ABCDFRPP',
} as never;

const lines = [{ description: 'Site', quantity: 2, unit: 'forfait', price: 100 }];

function dataFor(type: string, exempt: boolean, mention: string | null = null) {
  const defaults = documentDefaults({ ...SPACE_SETTINGS_DEFAULTS, vatExempt: exempt, vatExemptionMention: mention });
  const party = buildPartyAndLegalData({ companyName: 'Acme' } as never, provider, defaults);
  const base = { clientId: 'c', providerId: 'p', ...party, items: lines, tva_rate: exempt ? 0 : 20, railway_estimate: 0 };
  const dates = { invoice_date: '2026-11-06', due_date: '2026-12-06' };
  switch (type) {
    case 'devis':
      return { ...base, type, quote_number: 'D-1', quote_date: '2026-11-06', validity_date: '2026-12-06', project_name: 'P', providers: [], features: [], payment_providers: [] };
    case 'maintenance':
      return { ...base, type, quote_number: 'M-1', quote_date: '2026-11-06', validity_date: '2026-12-06', maintenance_period: '12 mois', providers: [], features: [], payment_providers: [] };
    case 'appel_de_fonds':
      return { ...base, type, invoice_number: 'A-1', ...dates, global_invoice_ref: 'F-1', project_name: 'P', project_step: 'Etape', payment_providers: [{ name: 'P', iban: 'FR76', bic: 'BIC', amount_to_pay: 100 }], providers: [], features: [] };
    default:
      return { ...base, type, invoice_number: 'F-1', ...dates, providers: [], features: [], payment_providers: [] };
  }
}

async function textOf(type: string, exempt: boolean, mention?: string | null) {
  const pdf = await generateDocument(dataFor(type, exempt, mention) as never, undefined);
  const dir = mkdtempSync(join(tmpdir(), 'vat-'));
  try {
    const file = join(dir, 'doc.pdf');
    writeFileSync(file, pdf);
    return execFileSync('python3', ['-c', EXTRACT, file]).toString();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!hasTypst || !hasExtractor)('VAT regime on generated documents', () => {
  for (const type of ['facture_prestation', 'devis', 'maintenance', 'appel_de_fonds']) {
    it(`${type}: a VAT exempt space prints no VAT line, a plain total and the 293 B mention`, async () => {
      const text = await textOf(type, true);

      expect(text).not.toMatch(/TVA\s*\(/);
      expect(text).not.toContain('TTC');
      expect(text).not.toContain('HT');
      expect(text).toContain(DEFAULT_VAT_EXEMPTION_MENTION);
      expect(text).toContain('TOTAL');
    });

    it(`${type}: a VAT registered space keeps the VAT line, TTC and HT`, async () => {
      const text = await textOf(type, false);

      if (type !== 'appel_de_fonds') {
        expect(text).toMatch(/TVA\s*\(20/);
        expect(text).toContain('TTC');
      }
      expect(text).toContain('HT');
      expect(text).not.toContain(DEFAULT_VAT_EXEMPTION_MENTION);
    });
  }

  it('prints the mention the space wrote instead of the default', async () => {
    const text = await textOf('facture_prestation', true, 'Exonération de TVA, art. 261 du CGI');

    expect(text).toContain('art. 261 du CGI');
    expect(text).not.toContain(DEFAULT_VAT_EXEMPTION_MENTION);
  });

  it('shows 200 as the total of 2 x 100 when exempt', async () => {
    const text = await textOf('facture_prestation', true);

    expect(text.replace(/\s/g, ' ')).toMatch(/TOTAL\s+200/);
    expect(text).not.toContain('240');
  });
});

describe.skipIf(!hasTypst)('service templates', () => {
  const types = ['prestation_barman', 'prestation_design', 'prestation_dev', 'prestation_photo', 'prestation_video', 'prestation_formation', 'prestation_btp'];

  for (const type of types) {
    for (const exempt of [true, false]) {
      it(`${type} compiles when VAT exempt is ${exempt}`, () => {
        const source = generateTypstContent(dataFor(type, exempt) as never);
        const dir = mkdtempSync(join(tmpdir(), 'svc-'));
        try {
          writeFileSync(join(dir, 'doc.typ'), source);
          copyFileSync(join(import.meta.dir, '../../../../typst/src/templates/logo.png'), join(dir, 'logo.png'));
          const result = spawnSync('typst', ['compile', join(dir, 'doc.typ'), join(dir, 'doc.pdf')], { cwd: dir });
          expect(source).toContain(`vat_exempt = "${exempt}"`);
          expect(result.stderr.toString()).not.toMatch(/^error:/m);
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });
    }
  }
});

describe('VAT exempt defaults', () => {
  it('default to the 293 B mention only when the space is exempt', () => {
    expect(documentDefaults({ ...SPACE_SETTINGS_DEFAULTS, vatExempt: true }).defaultVatExemptionMention).toBe(
      DEFAULT_VAT_EXEMPTION_MENTION
    );
    expect(documentDefaults({ ...SPACE_SETTINGS_DEFAULTS, vatExempt: false }).defaultVatExemptionMention).toBeNull();
  });
});
