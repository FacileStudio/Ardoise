import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { PLUME_SIGNATURE_HEADER, signContractWebhook } from '@repo/plume';
import { encryptSecret } from '@repo/trpc/settings';
import { createPlumeWebhookHandler } from './plume';

/**
 * A Plume event moves a document only when it is signed with a secret of the
 * document's own space: the tenant's webhook secret for a tenant document, the
 * platform secret (or the studio's own) for a platform studio document. Run
 * with TEST_DATABASE_URL and DATABASE_URL on the same throwaway database.
 */
process.env.ENCRYPTION_SECRET ??= 'plume-handler-test-encryption-secret-0123';
const env = {
  PLUME_URL: 'https://plume.test',
  PLUME_API_TOKEN: 'platform-token',
  PLUME_WEBHOOK_SECRET: 'platform-webhook-secret',
} as never;
const TENANT_SECRET = 'tenant-webhook-secret-0123456789';
const tables = '"User", "Space", "Client", "Mission", "Document"';
const ids: Record<string, string> = {};

describe.skipIf(!process.env.TEST_DATABASE_URL)('Plume webhook signatures follow the document space', () => {
  let release: () => Promise<void> = async () => {};
  const app = new Hono().post('/webhooks/plume', createPlumeWebhookHandler(env));

  const post = (documentId: string, secret: string) => {
    const body = JSON.stringify({
      event_type: 'document.completed',
      document: { id: 9, status: 'completed', external_ref: `ardoise:contract:${documentId}` },
    });
    return app.request('/webhooks/plume', {
      method: 'POST',
      body,
      headers: { [PLUME_SIGNATURE_HEADER]: signContractWebhook(secret, body) },
    });
  };
  const status = async (id: string) =>
    (await prisma.document.findUniqueOrThrow({ where: { id }, select: { signatureStatus: true } })).signatureStatus;

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables} CASCADE`);
    const owner = await prisma.user.create({ data: { email: 'o@plume.test', firstName: 'O', lastName: 'W', role: 'MEMBER' } });
    for (const [key, platformStudio] of [['tenant', false], ['studio', true]] as const) {
      const space = await prisma.space.create({ data: { name: key, platformStudio } });
      const client = await prisma.client.create({
        data: { contactFirstName: 'C', contactLastName: key, companyName: key, spaceId: space.id },
      });
      const document = await prisma.document.create({
        data: {
          type: 'contrat_prestation',
          name: `${key}.pdf`,
          clientName: client.companyName,
          providerName: 'P',
          items: [],
          subtotal: 1,
          tva: 0,
          total: 1,
          signatureStatus: 'sent',
          createdBy: owner.id,
          spaceId: space.id,
        },
      });
      ids[key] = document.id;
      ids[`${key}Space`] = space.id;
    }
    await prisma.spaceSettings.create({
      data: { spaceId: ids.tenantSpace!, plumeApiToken: encryptSecret('tenant-token'), plumeWebhookSecret: encryptSecret(TENANT_SECRET) },
    });
  }, 300_000);

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables} CASCADE`);
    await release();
  }, 120_000);

  test("refuses a tenant's secret on a studio document and the platform secret on a tenant document", async () => {
    expect((await post(ids.studio!, TENANT_SECRET)).status).toBe(401);
    expect((await post(ids.tenant!, 'platform-webhook-secret')).status).toBe(401);
    expect(await status(ids.studio!)).toBe('sent');
    expect(await status(ids.tenant!)).toBe('sent');
  });

  test("applies each document's event under its own space's secret", async () => {
    expect((await post(ids.tenant!, TENANT_SECRET)).status).toBe(200);
    expect((await post(ids.studio!, 'platform-webhook-secret')).status).toBe(200);
    expect(await status(ids.tenant!)).toBe('signed');
    expect(await status(ids.studio!)).toBe('signed');
  });
});
