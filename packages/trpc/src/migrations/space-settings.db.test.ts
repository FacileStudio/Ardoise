import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const enabled = !!process.env.TEST_DATABASE_URL;
const TARGET = '20261106150000_space_settings';
const PARSE = '20261107120000_counter_parse';
const MIGRATIONS = join(import.meta.dir, '../../../database/prisma/migrations');

const migrationNames = () =>
  readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

function urlFor(database: string) {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  url.pathname = `/${database}`;
  return url.toString();
}

describe.skipIf(!enabled)('migration space_settings', () => {
  const created: string[] = [];
  let admin: pg.Client;

  const template = `mig_tpl_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${template}"`);
    created.push(template);
    const db = new pg.Client({ connectionString: urlFor(template) });
    await db.connect();
    for (const dir of migrationNames()) {
      if (dir === TARGET) break;
      await db.query(readFileSync(join(MIGRATIONS, dir, 'migration.sql'), 'utf8'));
    }
    await db.end();
  }, 120_000);

  afterAll(async () => {
    for (const name of created) await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.end();
  }, 60_000);

  async function before(seed: (db: pg.Client) => Promise<void>) {
    const name = `mig_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
    await admin.query(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
    created.push(name);
    const db = new pg.Client({ connectionString: urlFor(name) });
    await db.connect();
    await db.query(`INSERT INTO "User"(id, email, "firstName", "lastName", role, "updatedAt") VALUES ('u1','a@x.test','a','b','MEMBER', now())`);
    await seed(db);
    return db;
  }

  const apply = (db: pg.Client) => db.query(readFileSync(join(MIGRATIONS, TARGET, 'migration.sql'), 'utf8'));

  const space = (db: pg.Client, id: string) =>
    db.query(`INSERT INTO "Space"(id, name, "updatedAt") VALUES ($1, $1, now())`, [id]);

  const document = (
    db: pg.Client,
    id: string,
    spaceId: string,
    numbers: { invoice?: string; quote?: string },
    source = 'generated'
  ) =>
    db.query(
      `INSERT INTO "Document"(id, type, name, "invoiceNumber", "quoteNumber", "clientName", "providerName", items, subtotal, tva, total, "createdBy", "spaceId", source, "updatedAt")
       VALUES ($1, 'facture_prestation', 'n', $2, $3, 'c', 'p', '[]', 1, 1, 1, 'u1', $4, $5::"DocumentSource", now())`,
      [id, numbers.invoice ?? null, numbers.quote ?? null, spaceId, source]
    );

  const counters = async (db: pg.Client) =>
    Object.fromEntries(
      (await db.query(`SELECT "spaceId", kind, next FROM "DocumentCounter" ORDER BY 1, 2`)).rows.map((row) => [
        `${row.spaceId}/${row.kind}`,
        row.next,
      ])
    );

  it('seeds every space with numbers from the global counter, whatever the number format', async () => {
    const db = await before(async (db) => {
      await db.query(
        `INSERT INTO "Settings"(id, "nextInvoiceNumber", "nextQuoteNumber", "invoiceNumberFormat", "updatedAt") VALUES ('global', 412, 9, '{{number}}/{{year}}', now())
         ON CONFLICT (id) DO UPDATE SET "nextInvoiceNumber" = 412, "nextQuoteNumber" = 9, "invoiceNumberFormat" = '{{number}}/{{year}}'`
      );
      for (const id of ['slash', 'glued', 'plain', 'quotes', 'empty', 'imported']) await space(db, id);
      await document(db, 'd1', 'slash', { invoice: '007/2026' });
      await document(db, 'd2', 'glued', { invoice: 'FAC2026009' });
      await document(db, 'd3', 'plain', { invoice: 'INVOICE' });
      await document(db, 'd4', 'quotes', { quote: 'DEVIS-2026-003' });
      await document(db, 'd5', 'imported', { invoice: 'EXT-1' }, 'imported');
    });
    await apply(db);

    expect(await counters(db)).toEqual({
      'slash/invoice': 412,
      'glued/invoice': 412,
      'plain/invoice': 412,
      'imported/invoice': 412,
      'quotes/quote': 9,
    });
    const settings = await db.query(`SELECT "spaceId", "invoiceNumberFormat" FROM "SpaceSettings" WHERE "spaceId" = 'slash'`);
    expect(settings.rows[0].invoiceNumberFormat).toBe('{{number}}/{{year}}');
    await db.end();
  });

  it('marks platform studio spaces VAT exempt with the mention, and no other space', async () => {
    const db = await before(async (db) => {
      await db.query(`INSERT INTO "Settings"(id, "defaultVatExemptionMention", "updatedAt") VALUES ('global', 'TVA non applicable, article 293 B du CGI', now())
        ON CONFLICT (id) DO UPDATE SET "defaultVatExemptionMention" = 'TVA non applicable, article 293 B du CGI'`);
      await space(db, 'studio');
      await space(db, 'other');
      await db.query(`UPDATE "Space" SET "platformStudio" = true WHERE id = 'studio'`);
    });
    await apply(db);

    const rows = await db.query(`SELECT "spaceId", "vatExempt", "vatExemptionMention" FROM "SpaceSettings" ORDER BY 1`);
    expect(rows.rows).toEqual([
      { spaceId: 'other', vatExempt: false, vatExemptionMention: null },
      { spaceId: 'studio', vatExempt: true, vatExemptionMention: 'TVA non applicable, article 293 B du CGI' },
    ]);
    await db.end();
  });

  it('raises a counter behind the highest default-shape number, and leaves other shapes alone', async () => {
    const db = await before(async (db) => {
      await db.query(`INSERT INTO "Settings"(id, "nextInvoiceNumber", "nextQuoteNumber", "updatedAt") VALUES ('global', 1, 1, now())
        ON CONFLICT (id) DO UPDATE SET "nextInvoiceNumber" = 1, "nextQuoteNumber" = 1`);
      for (const id of ['behind', 'ahead', 'odd', 'quote']) await space(db, id);
      await document(db, 'd1', 'behind', { invoice: 'FAC-2026-007' });
      await document(db, 'd2', 'behind', { invoice: 'FAC-2026-012' });
      await document(db, 'd3', 'ahead', { invoice: 'FAC-2026-003' });
      await document(db, 'd4', 'odd', { invoice: '007/2026' });
      await document(db, 'd5', 'quote', { quote: 'DEVIS-2026-004' });
    });
    await apply(db);
    await db.query("UPDATE \"DocumentCounter\" SET next = 50 WHERE \"spaceId\" = 'ahead'");
    await db.query(readFileSync(join(MIGRATIONS, PARSE, 'migration.sql'), 'utf8'));

    expect(await counters(db)).toEqual({
      'behind/invoice': 13,
      'ahead/invoice': 50,
      'odd/invoice': 1,
      'quote/quote': 5,
    });
    await db.end();
  });

  it('seeds from 1 when the global settings row never existed', async () => {
    const db = await before(async (db) => {
      await db.query(`DELETE FROM "Settings"`);
      await space(db, 's');
      await document(db, 'd1', 's', { invoice: 'X-5' });
    });
    await apply(db);

    expect(await counters(db)).toEqual({ 's/invoice': 1 });
    await db.end();
  });

  it('adds the unique indexes when the numbers are unique, and then refuses a duplicate', async () => {
    const db = await before(async (db) => {
      await space(db, 'a');
      await space(db, 'b');
      await document(db, 'd1', 'a', { invoice: 'F-1' });
      await document(db, 'd2', 'b', { invoice: 'F-1' });
    });
    await apply(db);

    await expect(document(db, 'd3', 'a', { invoice: 'F-1' })).rejects.toThrow('duplicate key');
    await document(db, 'd4', 'a', {});
    await document(db, 'd5', 'a', {});
    await db.end();
  });

  it('skips the unique index instead of failing when a space already holds duplicates', async () => {
    const db = await before(async (db) => {
      await space(db, 'a');
      await document(db, 'd1', 'a', { invoice: 'F-1' });
      await document(db, 'd2', 'a', { invoice: 'F-1' });
    });
    await apply(db);

    const indexes = await db.query(`SELECT indexname FROM pg_indexes WHERE indexname LIKE 'Document_spaceId_%_key'`);
    expect(indexes.rows.map((row) => row.indexname)).toEqual(['Document_spaceId_quoteNumber_key']);
    await db.end();
  });
});
