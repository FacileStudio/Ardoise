import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '@repo/database';
import { memberProcedure, platformStaffProcedure, router } from '../../trpc';
import { invalidateCatalog } from './api';
import { pushEntitlementsNow, requestEntitlementPush } from './push';
import { isPlatformStaff } from '../../platform-staff';
import {
  LIVE_STATUSES,
  assertDraft,
  migrateSubscribers,
  previewPublish,
  publishVersion,
  releaseDraftPrices,
  requireVersion,
} from './stripe-sync';
import {
  MAX_AMOUNT_CENTS,
  MAX_FEATURES,
  entitlementValueSchema,
  featureKeySchema,
  isValueOfKind,
  lookupKeyFor,
  planKeySchema,
  type EntitlementValue,
} from './values';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

const json = (value: unknown) =>
  value === undefined || value === null
    ? null
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

/** Writes one audit row for a billing change: who, what, before and after. */
async function audit(
  ctx: { db: PrismaClient; user: { id: string }; ipAddress?: string | null; userAgent?: string },
  entity: string,
  entityId: string,
  action: AuditAction,
  before: unknown,
  after: unknown
) {
  await ctx.db.auditLog.create({
    data: {
      userId: ctx.user.id,
      entity: `billing.${entity}`,
      entityId,
      action,
      changes: { before: json(before), after: json(after) } as Prisma.InputJsonValue,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });
}

const text = (max: number) => z.string().trim().max(max);
const spaceIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
const subjectSchema = z.string().trim().min(1).max(200).regex(/^[\x21-\x7e]+$/);
const id = z.string().min(1).max(100);
const amount = z.number().int().min(0).max(MAX_AMOUNT_CENTS).nullable();

const featureInput = z
  .object({
    key: featureKeySchema,
    app: z.string().trim().min(1).max(40).regex(/^[a-z0-9_]+$/),
    kind: z.enum(['bool', 'limit']),
    unit: text(40).nullable(),
    defaultValue: entitlementValueSchema,
    description: text(500).nullable(),
  })
  .strict();

const planInput = z
  .object({
    key: planKeySchema,
    name: text(80).min(1),
    sortOrder: z.number().int().min(0).max(1000),
    isFree: z.boolean().optional(),
  })
  .strict();

const draftInput = z
  .object({
    id,
    values: z
      .record(featureKeySchema, entitlementValueSchema)
      .refine((values) => Object.keys(values).length <= MAX_FEATURES, 'Trop de fonctionnalités'),
    prices: z.object({ month: amount, year: amount }).strict(),
  })
  .strict();

const overrideInput = z
  .object({
    scope: z.enum(['space', 'person']),
    registreSpaceId: spaceIdSchema.nullable(),
    personSub: subjectSchema.nullable(),
    personEmail: z.email().max(320).nullable(),
    feature: featureKeySchema,
    value: entitlementValueSchema,
    reason: text(500).min(1),
    expiresAt: z.coerce.date().nullable(),
  })
  .strict()
  .refine((o) => (o.scope === 'space' ? !!o.registreSpaceId && !o.personSub : !!o.personSub && !o.registreSpaceId), {
    message: 'Un espace ou une personne, selon la portée',
  });

const compInput = z
  .object({
    email: z.email().max(320),
    registreSub: subjectSchema.nullable(),
    reason: text(500).min(1),
    planKey: planKeySchema,
  })
  .strict();

const spaceCompInput = z
  .object({ registreSpaceId: spaceIdSchema, reason: text(500).min(1), planKey: planKeySchema })
  .strict();

function badRequest(message: string): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message });
}

/** Fails unless every value matches its feature's kind. */
async function checkValues(db: PrismaClient, values: Record<string, unknown>) {
  const features = await db.feature.findMany({ where: { key: { in: Object.keys(values) } } });
  const byKey = new Map(features.map((feature) => [feature.key, feature]));
  for (const [key, value] of Object.entries(values)) {
    const feature = byKey.get(key);
    if (!feature) badRequest(`Fonctionnalité inconnue: ${key}`);
    if (!isValueOfKind(feature.kind, value)) badRequest(`Valeur invalide pour ${key}`);
  }
  return byKey;
}

async function stripeOrNull(ctx: { getStripe: () => Promise<{ client: unknown }> }) {
  try {
    return (await ctx.getStripe()).client as import('stripe').default;
  } catch {
    return null;
  }
}

const versionSummary = {
  id: true,
  version: true,
  status: true,
  publishedAt: true,
  _count: { select: { subscriptions: { where: { status: { in: LIVE_STATUSES } } } } },
} as const;

/** The billing backoffice: features, versioned plans, overrides, comps and subscriptions. Staff only. */
export const billingRouter = router({
  access: memberProcedure.query(async ({ ctx }) => ({
    staff: await isPlatformStaff(ctx.db, ctx.user.id, ctx.env),
  })),

  features: platformStaffProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.feature.findMany({ orderBy: [{ app: 'asc' }, { key: 'asc' }] });
    return rows.map((row) => ({ ...row, defaultValue: row.defaultValue as EntitlementValue }));
  }),

  saveFeature: platformStaffProcedure.input(featureInput).mutation(async ({ ctx, input }) => {
    if (!isValueOfKind(input.kind, input.defaultValue)) badRequest('Valeur par défaut invalide');
    const before = await ctx.db.feature.findUnique({ where: { key: input.key } });
    if (before && before.kind !== input.kind) badRequest('Le type d’une fonctionnalité ne change pas');
    const after = await ctx.db.feature.upsert({
      where: { key: input.key },
      create: input,
      update: { app: input.app, unit: input.unit, defaultValue: input.defaultValue, description: input.description },
    });
    await audit(ctx, 'feature', after.id, before ? 'UPDATE' : 'CREATE', before, after);
    invalidateCatalog();
    requestEntitlementPush();
    return after;
  }),

  plans: platformStaffProcedure.query(({ ctx }) =>
    ctx.db.plan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      include: { versions: { orderBy: { version: 'desc' }, select: versionSummary } },
    })
  ),

  savePlan: platformStaffProcedure.input(planInput).mutation(async ({ ctx, input }) => {
    const before = await ctx.db.plan.findUnique({ where: { key: input.key } });
    const fields = { name: input.name, sortOrder: input.sortOrder, ...(input.isFree === undefined ? {} : { isFree: input.isFree }) };
    const after = await ctx.db.$transaction(async (tx) => {
      if (input.isFree) await tx.plan.updateMany({ where: { isFree: true, key: { not: input.key } }, data: { isFree: false } });
      return tx.plan.upsert({ where: { key: input.key }, create: { key: input.key, ...fields }, update: fields });
    });
    await audit(ctx, 'plan', after.id, before ? 'UPDATE' : 'CREATE', before, after);
    invalidateCatalog();
    return after;
  }),

  version: platformStaffProcedure.input(z.object({ id }).strict()).query(async ({ ctx, input }) => {
    const version = await requireVersion(ctx.db, input.id);
    return {
      ...version,
      features: version.features.map((row) => ({ ...row, value: row.value as EntitlementValue })),
      values: Object.fromEntries(
        version.features.map((row) => [row.feature.key, row.value as EntitlementValue])
      ),
    };
  }),

  createDraft: platformStaffProcedure.input(z.object({ planId: id }).strict()).mutation(async ({ ctx, input }) => {
    const plan = await ctx.db.plan.findUnique({
      where: { id: input.planId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1, include: { features: true, prices: true } } },
    });
    if (!plan) throw new TRPCError({ code: 'NOT_FOUND', message: 'Offre introuvable' });
    const existing = await ctx.db.planVersion.findFirst({ where: { planId: plan.id, status: 'draft' } });
    if (existing) return existing;
    const latest = plan.versions[0];
    const draft = await ctx.db.planVersion.create({
      data: {
        planId: plan.id,
        version: (latest?.version ?? 0) + 1,
        status: 'draft',
        features: {
          create: latest?.features.map((row) => ({ featureId: row.featureId, value: row.value as Prisma.InputJsonValue })) ?? [],
        },
        prices: {
          create:
            latest?.prices.map((price) => ({
              interval: price.interval,
              amount: price.amount,
              currency: price.currency,
              lookupKey: lookupKeyFor(plan.key, price.interval),
            })) ?? [],
        },
      },
    }).catch((error: unknown) => {
      if ((error as { code?: string }).code === 'P2002') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Un brouillon vient d’être créé pour cette offre', cause: error });
      }
      throw error;
    });
    await audit(ctx, 'planVersion', draft.id, 'CREATE', null, draft);
    return draft;
  }),

  saveDraft: platformStaffProcedure.input(draftInput).mutation(async ({ ctx, input }) => {
    const before = await requireVersion(ctx.db, input.id);
    assertDraft(before);
    const features = await checkValues(ctx.db, input.values);
    const intervals = ['month', 'year'] as const;
    await ctx.db.$transaction([
      ctx.db.planVersionFeature.deleteMany({ where: { versionId: before.id } }),
      ctx.db.planVersionFeature.createMany({
        data: Object.entries(input.values).map(([key, value]) => ({
          versionId: before.id,
          featureId: features.get(key)!.id,
          value,
        })),
      }),
      ...intervals.map((interval) => {
        const cents = input.prices[interval];
        if (cents === null) return ctx.db.planPrice.deleteMany({ where: { versionId: before.id, interval } });
        const stored = before.prices.find((price) => price.interval === interval);
        return ctx.db.planPrice.upsert({
          where: { versionId_interval: { versionId: before.id, interval } },
          create: { versionId: before.id, interval, amount: cents, currency: 'eur', lookupKey: lookupKeyFor(before.plan.key, interval) },
          update: stored?.amount === cents ? { amount: cents } : { amount: cents, stripePriceId: null },
        });
      }),
    ]);
    const after = await requireVersion(ctx.db, input.id);
    await audit(ctx, 'planVersion', before.id, 'UPDATE', before, after);
    requestEntitlementPush();
    return after;
  }),

  deleteDraft: platformStaffProcedure.input(z.object({ id }).strict()).mutation(async ({ ctx, input }) => {
    const before = await requireVersion(ctx.db, input.id);
    assertDraft(before);
    if ((await ctx.db.planVersion.count({ where: { planId: before.planId } })) === 1) {
      badRequest('La seule version d’une offre ne se supprime pas');
    }
    await releaseDraftPrices(ctx.db, await stripeOrNull(ctx), before);
    await ctx.db.planVersion.delete({ where: { id: before.id } });
    await audit(ctx, 'planVersion', before.id, 'DELETE', before, null);
    requestEntitlementPush();
    return { ok: true };
  }),

  previewPublish: platformStaffProcedure
    .input(z.object({ id }).strict())
    .query(({ ctx, input }) => previewPublish(ctx.db, input.id)),

  publish: platformStaffProcedure.input(z.object({ id }).strict()).mutation(async ({ ctx, input }) => {
    const before = await requireVersion(ctx.db, input.id);
    const result = await publishVersion(ctx.db, await stripeOrNull(ctx), input.id, ctx.log);
    const after = await requireVersion(ctx.db, input.id);
    await audit(ctx, 'planVersion', input.id, 'UPDATE', before, { ...after, ...result });
    invalidateCatalog();
    requestEntitlementPush();
    return { ...after, archiveFailures: result.archiveFailures };
  }),

  migrateSubscribers: platformStaffProcedure
    .input(z.object({ planId: id, mode: z.enum(['period_end', 'immediate']) }).strict())
    .mutation(async ({ ctx, input }) => {
      const stripe = await stripeOrNull(ctx);
      if (!stripe) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripe n’est pas configuré' });
      const result = await migrateSubscribers(ctx.db, stripe, input.planId, input.mode, ctx.log);
      await audit(ctx, 'plan', input.planId, 'UPDATE', null, { migration: input.mode, ...result });
      requestEntitlementPush();
      return result;
    }),

  overrides: platformStaffProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.entitlementOverride.findMany({
      orderBy: { createdAt: 'desc' },
      include: { feature: { select: { key: true, kind: true } } },
    });
    return rows.map((row) => ({ ...row, value: row.value as EntitlementValue }));
  }),

  createOverride: platformStaffProcedure.input(overrideInput).mutation(async ({ ctx, input }) => {
    const features = await checkValues(ctx.db, { [input.feature]: input.value });
    const after = await ctx.db.entitlementOverride.create({
      data: {
        scope: input.scope,
        registreSpaceId: input.registreSpaceId,
        personSub: input.personSub,
        personEmail: input.personEmail?.toLowerCase() ?? null,
        featureId: features.get(input.feature)!.id,
        value: input.value,
        reason: input.reason,
        expiresAt: input.expiresAt,
        createdBy: ctx.user.email,
      },
    });
    await audit(ctx, 'override', after.id, 'CREATE', null, after);
    requestEntitlementPush();
    return after;
  }),

  deleteOverride: platformStaffProcedure.input(z.object({ id }).strict()).mutation(async ({ ctx, input }) => {
    const before = await ctx.db.entitlementOverride.findUnique({ where: { id: input.id } });
    if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dérogation introuvable' });
    await ctx.db.entitlementOverride.delete({ where: { id: input.id } });
    await audit(ctx, 'override', before.id, 'DELETE', before, null);
    requestEntitlementPush();
    return { ok: true };
  }),

  comps: platformStaffProcedure.query(({ ctx }) => ctx.db.compedPerson.findMany({ orderBy: { email: 'asc' } })),

  saveComp: platformStaffProcedure.input(compInput).mutation(async ({ ctx, input }) => {
    const email = input.email.toLowerCase();
    if (!(await ctx.db.plan.findUnique({ where: { key: input.planKey } }))) badRequest('Offre inconnue');
    const before = await ctx.db.compedPerson.findUnique({ where: { email } });
    const fields = { registreSub: input.registreSub, reason: input.reason, planKey: input.planKey };
    const after = await ctx.db.compedPerson.upsert({
      where: { email },
      create: { email, ...fields },
      update: fields,
    });
    await audit(ctx, 'comp', after.id, before ? 'UPDATE' : 'CREATE', before, after);
    requestEntitlementPush();
    return after;
  }),

  deleteComp: platformStaffProcedure.input(z.object({ id }).strict()).mutation(async ({ ctx, input }) => {
    const before = await ctx.db.compedPerson.findUnique({ where: { id: input.id } });
    if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Personne introuvable' });
    await ctx.db.compedPerson.delete({ where: { id: input.id } });
    await audit(ctx, 'comp', before.id, 'DELETE', before, null);
    requestEntitlementPush();
    return { ok: true };
  }),

  spaceComps: platformStaffProcedure.query(({ ctx }) =>
    ctx.db.compedSpace.findMany({ orderBy: { createdAt: 'desc' } })
  ),

  saveSpaceComp: platformStaffProcedure.input(spaceCompInput).mutation(async ({ ctx, input }) => {
    if (!(await ctx.db.plan.findUnique({ where: { key: input.planKey } }))) badRequest('Offre inconnue');
    const before = await ctx.db.compedSpace.findUnique({ where: { registreSpaceId: input.registreSpaceId } });
    const fields = { reason: input.reason, planKey: input.planKey };
    const after = await ctx.db.compedSpace.upsert({
      where: { registreSpaceId: input.registreSpaceId },
      create: { registreSpaceId: input.registreSpaceId, createdBy: ctx.user.email, ...fields },
      update: fields,
    });
    await audit(ctx, 'spaceComp', after.id, before ? 'UPDATE' : 'CREATE', before, after);
    requestEntitlementPush();
    return after;
  }),

  deleteSpaceComp: platformStaffProcedure.input(z.object({ id }).strict()).mutation(async ({ ctx, input }) => {
    const before = await ctx.db.compedSpace.findUnique({ where: { id: input.id } });
    if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Espace introuvable' });
    await ctx.db.compedSpace.delete({ where: { id: input.id } });
    await audit(ctx, 'spaceComp', before.id, 'DELETE', before, null);
    requestEntitlementPush();
    return { ok: true };
  }),

  subscriptions: platformStaffProcedure.query(({ ctx }) =>
    ctx.db.spaceSubscription.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { planVersion: { select: { version: true, plan: { select: { key: true, name: true } } } } },
    })
  ),

  duplicateSubscriptions: platformStaffProcedure.query(({ ctx }) =>
    ctx.db.duplicateSubscription.findMany({ orderBy: { detectedAt: 'desc' } })
  ),

  pushState: platformStaffProcedure.query(({ ctx }) =>
    ctx.db.entitlementPushState.findUnique({ where: { id: 'singleton' } })
  ),

  pushNow: platformStaffProcedure.mutation(async ({ ctx }) => {
    const outcome = await pushEntitlementsNow();
    await audit(ctx, 'push', 'singleton', 'UPDATE', null, { status: outcome.status });
    return outcome;
  }),
});
