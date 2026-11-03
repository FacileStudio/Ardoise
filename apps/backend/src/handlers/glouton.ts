import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { PrismaClient } from '@repo/database';
import {
  bearerMatches,
  gloutonConfigFromEnv,
  toClientPayload,
  type GloutonEnv,
} from '@repo/glouton';
import { logger } from '../lib/logger';

export const GLOUTON_ROUTES_PREFIX = '/api/integrations/glouton';

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  text(max)
    .nullable()
    .transform((value) => value || null);

export const clientPayloadSchema = z.object({
  id: z.string().optional(),
  gloutonCompanyId: z.string().trim().min(1).max(200),
  registreSpaceId: z.string().trim().min(1).max(200).nullable(),
  companyName: text(300).min(1),
  contactFirstName: text(200),
  contactLastName: text(200),
  contactEmail: z.email().max(320).nullable(),
  billingAddress: optionalText(500),
  billingCity: optionalText(200),
  billingPostalCode: optionalText(40),
  billingCountry: optionalText(200),
  siret: optionalText(40),
  tvaIntracom: optionalText(40),
  updatedAt: z.iso.datetime({ offset: true }),
  actorEmail: z.email().optional(),
});

type ClientPayload = z.infer<typeof clientPayloadSchema>;

const clientInclude = {
  space: { select: { registreSpaceId: true } },
  _count: { select: { missions: true, payments: true } },
} as const;

class SyncError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 422,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const fail = (c: Context, status: 400 | 401 | 404 | 409 | 422, code: string, message: string) =>
  c.json({ error: { code, message } }, status);

const written = (client: { id: string; updatedAt: Date }, skipped = false) => ({
  data: {
    id: client.id,
    updatedAt: client.updatedAt.toISOString(),
    ...(skipped ? { skipped } : {}),
  },
});

async function readPayload(c: Context): Promise<ClientPayload> {
  const body = await c.req.json().catch(() => undefined);
  const parsed = clientPayloadSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'body').join(', ');
    throw new SyncError(400, 'invalid_payload', `Invalid client payload: ${fields}`);
  }
  return parsed.data;
}

async function spaceIdFor(db: PrismaClient, registreSpaceId: string | null) {
  if (!registreSpaceId) return null;
  const space = await db.space.findUnique({ where: { registreSpaceId }, select: { id: true } });
  if (!space)
    throw new SyncError(422, 'unknown_space', 'No Ardoise space has this registreSpaceId');
  return space.id;
}

const fields = (payload: ClientPayload) => ({
  gloutonCompanyId: payload.gloutonCompanyId,
  companyName: payload.companyName,
  contactFirstName: payload.contactFirstName,
  contactLastName: payload.contactLastName,
  contactEmail: payload.contactEmail,
  billingAddress: payload.billingAddress,
  billingCity: payload.billingCity,
  billingPostalCode: payload.billingPostalCode,
  billingCountry: payload.billingCountry,
  siret: payload.siret,
  tvaIntracom: payload.tvaIntracom,
  updatedAt: new Date(payload.updatedAt),
});

type StoredClient = NonNullable<Awaited<ReturnType<typeof findClient>>>;

function findClient(db: PrismaClient, where: { id: string } | { gloutonCompanyId: string }) {
  return db.client.findUnique({ where, include: clientInclude });
}

async function nextSpaceId(db: PrismaClient, client: StoredClient, payload: ClientPayload) {
  if ((client.space?.registreSpaceId ?? null) === payload.registreSpaceId) return client.spaceId;
  const hasHistory = client._count.missions > 0 || client._count.payments > 0;
  if (hasHistory) {
    logger.warn({ clientId: client.id }, 'Glouton moved a client with history; space kept');
    return client.spaceId;
  }
  return spaceIdFor(db, payload.registreSpaceId);
}

async function updateClient(db: PrismaClient, client: StoredClient, payload: ClientPayload) {
  if (new Date(payload.updatedAt) <= client.updatedAt) return written(client, true);
  const owner = await db.client.findUnique({
    where: { gloutonCompanyId: payload.gloutonCompanyId },
    select: { id: true },
  });
  if (owner && owner.id !== client.id) {
    throw new SyncError(409, 'already_linked', 'This Glouton company is linked to another client');
  }
  const spaceId = await nextSpaceId(db, client, payload);
  const updated = await db.client.update({
    where: { id: client.id },
    data: { ...fields(payload), spaceId },
  });
  logger.info({ clientId: client.id, actor: payload.actorEmail }, 'Client updated from Glouton');
  return written(updated);
}

async function upsertClient(db: PrismaClient, payload: ClientPayload) {
  const linked = await findClient(db, { gloutonCompanyId: payload.gloutonCompanyId });
  if (linked) return updateClient(db, linked, payload);
  const spaceId = await spaceIdFor(db, payload.registreSpaceId);
  const created = await db.client.create({ data: { ...fields(payload), spaceId } });
  logger.info({ clientId: created.id, actor: payload.actorEmail }, 'Client created from Glouton');
  return written(created);
}

async function requireClient(db: PrismaClient, id: string) {
  const client = await findClient(db, { id });
  if (!client) throw new SyncError(404, 'not_found', 'Client not found');
  return client;
}

export function createGloutonRoutes(env: GloutonEnv, db: PrismaClient) {
  const config = gloutonConfigFromEnv(env);
  const app = new Hono();

  app.use('*', async (c, next) => {
    if (!config) return fail(c, 404, 'not_configured', 'Glouton sync is not configured');
    if (!bearerMatches(config.token, c.req.header('authorization'))) {
      return fail(c, 401, 'unauthorized', 'Invalid token');
    }
    return next();
  });

  app.onError((err, c) => {
    if (err instanceof SyncError) return fail(c, err.status, err.code, err.message);
    logger.error({ err }, 'Glouton sync failed');
    return c.json({ error: { code: 'internal', message: 'Internal server error' } }, 500);
  });

  app.post('/clients', async (c) => c.json(await upsertClient(db, await readPayload(c))));

  app.put('/clients/:id', async (c) => {
    const payload = await readPayload(c);
    return c.json(await updateClient(db, await requireClient(db, c.req.param('id')), payload));
  });

  app.post('/clients/:id/unlink', async (c) => {
    const client = await requireClient(db, c.req.param('id'));
    const updated = await db.client.update({
      where: { id: client.id },
      data: { gloutonCompanyId: null },
    });
    logger.info({ clientId: client.id }, 'Client unlinked from Glouton');
    return c.json(written(updated));
  });

  app.get('/clients/:id', async (c) => {
    const client = await requireClient(db, c.req.param('id'));
    return c.json({ data: toClientPayload(client) });
  });

  return app;
}
