import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type CryptoKey } from 'jose';
import { lockTestDatabase } from '@repo/database/test-lock';
import type { PrismaClient } from '@repo/database';
import { loginBlockReason } from '@repo/trpc/auth/session';
import { appRouter } from '@repo/trpc';

import { PrismaClient as Client } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { resolveUser } from '../oidc/identity';
import { DeletionsPath, UserDeletedEvent, createDeletionHandler, pollDeletions } from './deletions';
import { ERASED_FIRST_NAME, ERASED_LAST_NAME, erasedEmail, erasePerson } from '@repo/trpc/erasure';

/**
 * Erases a person through the real push handler against a migrated Postgres
 * and checks the whole database afterwards. Run with TEST_DATABASE_URL; the
 * file truncates every table it fills, before and after.
 */
const url = process.env.TEST_DATABASE_URL;
const issuer = 'https://sso.example.test';
const clientId = 'ardoise-test';
const silent = { info: () => {}, warn: () => {} };

const erin = {
  sub: 'sub-erin-7f3a91',
  email: 'Erin.Quillfeather@example.test',
  firstName: 'Erinna',
  lastName: 'Quillfeather',
};

const tables = `"User", "Space", "Provider", "Feature", "CompedPerson", "CompedSpace", "EntitlementOverride", "AuditLog", "Media"`;

const kept = [
  'Document',
  'Payment',
  'PaymentLink',
  'PaymentDocument',
  'Client',
  'Mission',
  'MissionProvider',
  'Prestation',
  'Provider',
  'Space',
];

const clara = {
  sub: 'sub-clara-2c8d40',
  email: 'Clara.Brightwater@example.test',
  firstName: 'Clarabel',
  lastName: 'Brightwater',
};

const customerRecordColumns = [
  'Client.contactEmail',
  'Client.contactFirstName',
  'Client.contactLastName',
];

const legalRecordColumns = new Set([
  'Document.providerName',
  'Document.providerEmail',
  'Document.name',
]);

if (!url)
  console.warn('[registre/erasure.db.test] TEST_DATABASE_URL unset: skipping the erasure DB test');

describe.skipIf(!url)('Registre erasure', () => {
  const pool = new pg.Pool({ connectionString: url ?? 'postgresql://unused' });
  const db = new Client({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;
  const ids: Record<string, string> = {};
  const removed: string[] = [];
  let privateKey: CryptoKey;
  let strangerKey: CryptoKey;
  let jwks: ReturnType<typeof createLocalJWKSet>;
  let release: () => Promise<void> = async () => {};

  const erase = (subject: string) =>
    erasePerson({ db, issuer, removeFile: async (key) => void removed.push(key) }, { subject });
  const app = new Hono().post(
    DeletionsPath,
    createDeletionHandler({
      clientId,
      keys: async () => ({ issuer, keys: jwks }),
      erase,
      logger: silent,
    })
  );
  const deliver = (body: string) => app.request(DeletionsPath, { method: 'POST', body });

  const notice = (
    subject: string,
    overrides: { key?: CryptoKey; typ?: string; aud?: string; iss?: string; events?: object } = {}
  ) =>
    new SignJWT({ events: overrides.events ?? { [UserDeletedEvent]: { erase_within_days: 30 } } })
      .setProtectedHeader({ alg: 'RS256', typ: overrides.typ ?? 'secevent+jwt', kid: 'k1' })
      .setIssuer(overrides.iss ?? issuer)
      .setAudience(overrides.aud ?? clientId)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime('10m')
      .setJti(crypto.randomUUID())
      .sign(overrides.key ?? privateKey);

  const rows = async (table: string) => {
    const result = await pool.query(
      `SELECT row_to_json(t)::text AS row FROM "${table}" t ORDER BY 1`
    );
    return result.rows.map((row) => row.row as string);
  };

  const fingerprint = async () => {
    const all = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
       ORDER BY 1`
    );
    const out: Record<string, string[]> = {};
    for (const { table_name } of all.rows) out[table_name] = await rows(table_name);
    return out;
  };

  const mentions = async (person: typeof erin = erin) => {
    const columns = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND data_type IN ('text', 'character varying', 'jsonb', 'json', 'ARRAY')`
    );
    const needles = [
      person.email.toLowerCase(),
      person.sub.toLowerCase(),
      person.firstName.toLowerCase(),
      person.lastName.toLowerCase(),
    ];
    const found: string[] = [];
    for (const { table_name, column_name } of columns.rows) {
      const result = await pool.query(
        `SELECT count(*)::int AS n FROM "${table_name}" WHERE ${needles.map((_, i) => `strpos(lower("${column_name}"::text), $${i + 1}) > 0`).join(' OR ')}`,
        needles
      );
      if (result.rows[0].n > 0) found.push(`${table_name}.${column_name}`);
    }
    return found.sort();
  };

  afterAll(async () => {
    await db.$executeRawUnsafe(`TRUNCATE ${tables} CASCADE`);
    await release();
    await pool.end();
  }, 600_000);

  beforeAll(async () => {
    release = await lockTestDatabase(url!);
    await db.$executeRawUnsafe(`TRUNCATE ${tables} CASCADE`);
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    strangerKey = (await generateKeyPair('RS256')).privateKey;
    jwks = createLocalJWKSet({
      keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' }],
    });

    const person = await db.user.create({
      data: {
        email: erin.email,
        firstName: erin.firstName,
        lastName: erin.lastName,
        role: 'MEMBER',
        emailVerified: true,
        lastLoginAt: new Date(),
        lastLoginIp: '203.0.113.9',
        ssoPictureUrl: 'https://sso.example.test/avatars/erin.png',
        accounts: {
          create: {
            id: crypto.randomUUID(),
            providerId: issuer,
            accountId: erin.sub,
            refreshToken: 'sealed-refresh',
          },
        },
      },
    });
    const bob = await db.user.create({
      data: {
        email: 'bob@example.test',
        firstName: 'Bob',
        lastName: 'Other',
        role: 'MEMBER',
        accounts: { create: { id: crypto.randomUUID(), providerId: issuer, accountId: 'sub-bob' } },
      },
    });
    const carl = await db.user.create({
      data: {
        email: 'carl@example.test',
        firstName: 'Carl',
        lastName: 'Polled',
        role: 'MEMBER',
        accounts: {
          create: { id: crypto.randomUUID(), providerId: `${issuer}/`, accountId: 'sub-carl' },
        },
      },
    });
    ids.erin = person.id;
    ids.bob = bob.id;
    ids.carl = carl.id;

    for (const userId of [person.id, person.id, bob.id]) {
      await db.session.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          token: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 3600_000),
          ipAddress: '203.0.113.9',
          userAgent: 'Firefox',
        },
      });
    }
    await db.magicLink.create({
      data: {
        userId: person.id,
        tokenHash: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 900_000),
      },
    });
    await db.adminPermission.create({
      data: { userId: person.id, entity: 'client', canRead: true },
    });
    await db.media.create({
      data: {
        url: 'https://api.example.test/storage/a.png',
        key: `uploads/${person.id}/avatar.png`,
        mimeType: 'image/png',
        size: 1,
        avatarUserId: person.id,
      },
    });

    const space = await db.space.create({
      data: {
        name: 'Atelier',
        registreSpaceId: 'r-atelier',
        members: {
          create: [
            { userId: person.id, role: 'OWNER' },
            { userId: bob.id, role: 'MEMBER' },
          ],
        },
      },
    });
    await db.invitation.create({
      data: {
        email: 'guest@example.test',
        tokenHash: crypto.randomUUID(),
        invitedById: person.id,
        spaceId: space.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await db.invitation.create({
      data: {
        email: erin.email.toLowerCase(),
        tokenHash: crypto.randomUUID(),
        invitedById: bob.id,
        spaceId: space.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    const feature = await db.feature.create({
      data: { key: 'ardoise.documents', app: 'ardoise', kind: 'limit', defaultValue: 10 },
    });
    await db.compedPerson.create({
      data: {
        email: erin.email.toLowerCase(),
        registreSub: erin.sub,
        reason: 'founder',
        planKey: 'studio',
      },
    });
    await db.entitlementOverride.create({
      data: {
        scope: 'person',
        personSub: erin.sub,
        personEmail: erin.email.toLowerCase(),
        featureId: feature.id,
        value: 100,
        reason: 'beta',
        createdBy: 'bob@example.test',
      },
    });
    await db.entitlementOverride.create({
      data: {
        scope: 'space',
        registreSpaceId: 'r-atelier',
        featureId: feature.id,
        value: 50,
        reason: 'launch',
        createdBy: erin.email,
      },
    });
    await db.compedSpace.create({
      data: {
        registreSpaceId: 'r-atelier',
        reason: 'partner',
        planKey: 'pro',
        createdBy: erin.email,
      },
    });
    await db.auditLog.create({
      data: {
        userId: person.id,
        entity: 'billing.comp',
        entityId: 'comp-1',
        action: 'CREATE',
        changes: {
          before: null,
          after: { email: erin.email.toLowerCase(), registreSub: erin.sub },
        },
        ipAddress: '203.0.113.9',
        userAgent: 'Firefox',
      },
    });
    await db.auditLog.create({
      data: {
        userId: bob.id,
        entity: 'user',
        entityId: person.id,
        action: 'UPDATE',
        changes: {
          before: { firstName: 'Erin', lastName: erin.lastName },
          after: { firstName: erin.firstName },
        },
      },
    });

    const provider = await db.provider.create({
      data: {
        name: 'Atelier Studio',
        legalName: 'Atelier Studio SAS',
        siret: '12345678900022',
        email: 'billing@atelier.test',
        spaceId: space.id,
      },
    });
    const customer = await db.client.create({
      data: {
        contactFirstName: 'Paula',
        contactLastName: 'Customer',
        contactEmail: 'paula@customer.test',
        companyName: 'Customer SA',
        spaceId: space.id,
      },
    });
    const mission = await db.mission.create({
      data: {
        name: 'Site',
        clientId: customer.id,
        spaceId: space.id,
        providers: { create: { providerId: provider.id } },
        prestations: { create: { description: 'Développement', unitPrice: 500, quantity: 2 } },
      },
    });
    const document = (
      type: 'devis' | 'facture_prestation' | 'contrat_prestation',
      numbers: object
    ) =>
      db.document.create({
        data: {
          type,
          name: `${type} pour Customer SA, émis par ${erin.firstName} ${erin.lastName}`,
          ...numbers,
          clientName: 'Customer SA',
          clientSiret: '98765432100011',
          clientAddress: '1 rue du Client',
          providerId: provider.id,
          providerName: `${erin.firstName} ${erin.lastName}`,
          providerSiret: '12345678900022',
          providerEmail: erin.email,
          items: [{ description: 'Développement', quantity: 2, unitPrice: 500 }],
          subtotal: 1000,
          tva: 200,
          total: 1200,
          pdfUrl: `https://api.example.test/storage/uploads/${person.id}/${type}.pdf`,
          pdfHash: 'f'.repeat(64),
          issuedAt: new Date('2026-10-01T10:00:00Z'),
          createdBy: person.id,
          spaceId: space.id,
          missionId: mission.id,
        },
      });
    await document('devis', { quoteNumber: 'DEVIS-2026-0001', version: 1 });
    const invoice = await document('facture_prestation', { invoiceNumber: 'FAC-2026-0001' });
    await document('contrat_prestation', { contractRef: 'CONT-2026-0001' });
    const payment = await db.payment.create({
      data: {
        clientId: customer.id,
        spaceId: space.id,
        missionId: mission.id,
        documentId: invoice.id,
        amount: 1200,
        totalWithFees: 1200,
        description: 'FAC-2026-0001',
        status: 'PAID',
        collectionMethod: 'MANUAL',
        dueDate: new Date('2026-10-31T00:00:00Z'),
        paidAt: new Date('2026-10-15T00:00:00Z'),
      },
    });
    await db.paymentDocument.create({ data: { paymentId: payment.id, documentId: invoice.id } });
    await db.paymentLink.create({
      data: {
        paymentId: payment.id,
        tokenHash: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
  }, 600_000);

  test('refuses every notice that does not verify, and changes nothing', async () => {
    const before = await fingerprint();
    const refused = [
      '',
      'not a token',
      await notice(erin.sub, { key: strangerKey }),
      await notice(erin.sub, { aud: 'another-app' }),
      await notice(erin.sub, { iss: 'https://evil.example.test' }),
      await notice(erin.sub, { typ: 'JWT' }),
      await notice(erin.sub, { events: { 'https://schemas.facile.studio/event/logout': {} } }),
    ];
    for (const body of refused) expect((await deliver(body)).status).toBe(400);
    expect(await fingerprint()).toEqual(before);
  }, 120_000);

  test('answers the never-known success for an unknown subject without touching a row', async () => {
    const before = await fingerprint();
    const response = await deliver(await notice('sub-never-seen'));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'unknown' });
    expect(await fingerprint()).toEqual(before);
  }, 120_000);

  test('anonymises the account, keeps every issued record byte for byte, and leaves no trace elsewhere', async () => {
    const keptBefore = Object.fromEntries(
      await Promise.all(kept.map(async (table) => [table, await rows(table)]))
    );
    const bobSessions = await db.session.count({ where: { userId: ids.bob } });

    const response = await deliver(await notice(erin.sub));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'erased' });

    for (const table of kept) expect(await rows(table)).toEqual(keptBefore[table]);
    expect(await mentions()).toEqual([...legalRecordColumns].sort());

    const tombstone = await db.user.findUniqueOrThrow({ where: { id: ids.erin } });
    expect(tombstone.email).toBe(erasedEmail(ids.erin!));
    expect([tombstone.firstName, tombstone.lastName]).toEqual([
      ERASED_FIRST_NAME,
      ERASED_LAST_NAME,
    ]);
    expect(tombstone.anonymizedAt).toBeInstanceOf(Date);
    expect([tombstone.lastLoginIp, tombstone.lastLoginAt, tombstone.ssoPictureUrl]).toEqual([
      null,
      null,
      null,
    ]);
    expect(loginBlockReason(tombstone)).not.toBeNull();
    expect(await db.document.count({ where: { createdBy: ids.erin } })).toBe(3);

    expect(await db.session.count({ where: { userId: ids.erin } })).toBe(0);
    expect(await db.magicLink.count({ where: { userId: ids.erin } })).toBe(0);
    expect(await db.account.count({ where: { userId: ids.erin } })).toBe(0);
    expect(await db.adminPermission.count({ where: { userId: ids.erin } })).toBe(0);
    expect(await db.spaceMember.count({ where: { userId: ids.erin } })).toBe(0);
    expect(await db.invitation.count()).toBe(0);
    expect(await db.media.count()).toBe(0);
    expect(removed).toEqual([`uploads/${ids.erin}/avatar.png`]);
    expect(await db.compedPerson.count()).toBe(0);
    expect(await db.entitlementOverride.count({ where: { scope: 'person' } })).toBe(0);
    expect(await db.entitlementOverride.count({ where: { scope: 'space' } })).toBe(1);
    expect(await db.compedSpace.count()).toBe(1);
    expect(await db.auditLog.count()).toBe(2);
    expect(
      await db.auditLog.count({ where: { userId: ids.erin, ipAddress: null, userAgent: null } })
    ).toBe(1);

    expect(await db.session.count({ where: { userId: ids.bob } })).toBe(bobSessions);
    expect(await db.spaceMember.count({ where: { userId: ids.bob } })).toBe(1);
    expect(await db.account.count({ where: { userId: ids.carl } })).toBe(1);
  }, 120_000);

  test('a second delivery of the same erasure is a no-op that still succeeds', async () => {
    const before = await fingerprint();
    const response = await deliver(await notice(erin.sub));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'unknown' });
    expect(await fingerprint()).toEqual(before);
  }, 120_000);

  test('the poller walks every page, erases across issuer spellings, and keeps going past a failure', async () => {
    const pages: Record<
      string,
      { deleted: { sub: string; deleted_at: string }[]; nextCursor?: string }
    > = {
      first: {
        deleted: [
          { sub: erin.sub, deleted_at: '2026-11-10T09:00:00Z' },
          { sub: 'sub-boom', deleted_at: '2026-11-10T09:01:00Z' },
        ],
        nextCursor: 'second',
      },
      second: { deleted: [{ sub: 'sub-carl', deleted_at: '2026-11-10T09:02:00Z' }] },
    };
    const result = await pollDeletions(
      { deletions: async (cursor) => pages[cursor ?? 'first']! },
      async (subject) => {
        if (subject === 'sub-boom') throw new Error('database down');
        return erase(subject);
      }
    );
    expect(result).toEqual({ erased: 1, unknown: 1, failed: ['sub-boom'] });
    const polled = await db.user.findUniqueOrThrow({ where: { id: ids.carl } });
    expect(polled.email).toBe(erasedEmail(ids.carl!));
    expect(await db.account.count({ where: { userId: ids.carl } })).toBe(0);
  }, 120_000);

  test('a later sign-in with the old subject or the same email lands on a new, unrelated account', async () => {
    const claims = {
      sub: erin.sub,
      email: erin.email,
      emailVerified: true,
      name: `${erin.firstName} ${erin.lastName}`,
    };
    const fresh = await resolveUser(db as never, issuer, claims);
    expect(fresh.id).not.toBe(ids.erin);
    expect(await db.document.count({ where: { createdBy: fresh.id } })).toBe(0);
    expect(await db.spaceMember.count({ where: { userId: fresh.id } })).toBe(0);
    expect(await db.account.count({ where: { userId: ids.erin } })).toBe(0);
  }, 120_000);

  test('a client deleting their own account goes through the same anonymisation', async () => {
    const space = await db.space.findFirstOrThrow({ where: { registreSpaceId: 'r-atelier' } });
    const provider = await db.provider.findFirstOrThrow({ where: { spaceId: space.id } });
    const user = await db.user.create({
      data: {
        email: clara.email,
        firstName: clara.firstName,
        lastName: clara.lastName,
        role: 'CLIENT',
        emailVerified: true,
        lastLoginAt: new Date(),
        lastLoginIp: '198.51.100.4',
        accounts: {
          create: { id: crypto.randomUUID(), providerId: issuer, accountId: clara.sub },
        },
        sessions: {
          create: {
            id: crypto.randomUUID(),
            token: crypto.randomUUID(),
            expiresAt: new Date(Date.now() + 3600_000),
            ipAddress: '198.51.100.4',
            userAgent: 'Safari',
          },
        },
        magicLinks: {
          create: { tokenHash: crypto.randomUUID(), expiresAt: new Date(Date.now() + 900_000) },
        },
      },
    });
    await db.media.create({
      data: {
        url: 'https://api.example.test/storage/c.png',
        key: `uploads/${user.id}/avatar.png`,
        mimeType: 'image/png',
        size: 1,
        avatarUserId: user.id,
      },
    });
    const customer = await db.client.create({
      data: {
        userId: user.id,
        contactFirstName: clara.firstName,
        contactLastName: clara.lastName,
        contactEmail: clara.email,
        companyName: 'Lune SARL',
        spaceId: space.id,
      },
    });
    const mission = await db.mission.create({
      data: { name: 'Boutique', clientId: customer.id, spaceId: space.id },
    });
    const invoice = await db.document.create({
      data: {
        type: 'facture_prestation',
        name: 'Facture Lune SARL',
        invoiceNumber: 'FAC-2026-0002',
        clientName: 'Lune SARL',
        providerId: provider.id,
        providerName: 'Atelier Studio',
        items: [{ description: 'Boutique', quantity: 1, unitPrice: 800 }],
        subtotal: 800,
        tva: 0,
        total: 800,
        issuedAt: new Date('2026-10-20T10:00:00Z'),
        createdBy: ids.bob!,
        spaceId: space.id,
        missionId: mission.id,
      },
    });
    await db.payment.create({
      data: {
        clientId: customer.id,
        spaceId: space.id,
        missionId: mission.id,
        documentId: invoice.id,
        amount: 800,
        totalWithFees: 800,
        description: 'FAC-2026-0002',
        status: 'PAID',
        collectionMethod: 'MANUAL',
        dueDate: new Date('2026-11-20T00:00:00Z'),
        paidAt: new Date('2026-10-25T00:00:00Z'),
      },
    });
    await db.compedPerson.create({
      data: { email: clara.email.toLowerCase(), reason: 'friend', planKey: 'pro' },
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        entity: 'client',
        entityId: customer.id,
        action: 'UPDATE',
        changes: { after: { email: clara.email.toLowerCase(), sub: clara.sub } },
        ipAddress: '198.51.100.4',
        userAgent: 'Safari',
      },
    });
    const keptBefore = Object.fromEntries(
      await Promise.all(kept.map(async (table) => [table, await rows(table)]))
    );
    removed.splice(0);

    const caller = appRouter.createCaller({
      req: new Request('http://api.test'),
      resHeaders: new Headers(),
      user: { id: user.id, role: 'CLIENT', email: clara.email },
      db,
      storage: { delete: async (key: string) => void removed.push(key) },
      env: { OIDC_ISSUER: issuer, ENCRYPTION_SECRET: 'x'.repeat(32) },
      log: { ...silent, debug: () => {}, error: () => {} },
    } as never);
    expect(await caller.user.deleteOwnAccount()).toEqual({ status: 'erased' });

    for (const table of kept) expect(await rows(table)).toEqual(keptBefore[table]);
    expect(await mentions(clara)).toEqual(customerRecordColumns);
    const tombstone = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(tombstone.email).toBe(erasedEmail(user.id));
    expect([tombstone.firstName, tombstone.lastName, tombstone.lastLoginIp]).toEqual([
      ERASED_FIRST_NAME,
      ERASED_LAST_NAME,
      null,
    ]);
    expect(loginBlockReason(tombstone)).not.toBeNull();
    expect(await db.client.count({ where: { userId: user.id } })).toBe(1);
    expect(await db.payment.count({ where: { clientId: customer.id } })).toBe(1);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.magicLink.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.account.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.compedPerson.count()).toBe(0);
    expect(removed).toEqual([`uploads/${user.id}/avatar.png`]);
    expect(await caller.user.deleteOwnAccount().catch((error) => error.code)).toBe('NOT_FOUND');
  }, 120_000);
});
