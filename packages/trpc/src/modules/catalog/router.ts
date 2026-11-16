import { router, memberProcedure } from '../../trpc';
import spaceService, { requireRowScope, scopeSpaceId, scopeWhere } from '../space/service';
import type { PrismaClient } from '@repo/database';
import { z } from 'zod';

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max).nullable().optional()
  );

const CatalogItemFields = z.object({
  category: optionalText(100),
  pack: optionalText(100),
  name: z.string().trim().min(1).max(200),
  description: optionalText(2000),
  quantity: z.number().positive().max(100000),
  unit: z.string().trim().min(1).max(30),
  unitPrice: z.number().nonnegative().max(10000000),
  billing: z.enum(['ONE_TIME', 'MONTHLY']),
  active: z.boolean(),
  position: z.number().int().min(0).max(100000),
});

const CreateCatalogItemInput = CatalogItemFields.extend({
  spaceId: z.string().min(1),
  quantity: CatalogItemFields.shape.quantity.default(1),
  unit: CatalogItemFields.shape.unit.default('jour'),
  billing: CatalogItemFields.shape.billing.default('ONE_TIME'),
  active: CatalogItemFields.shape.active.default(true),
  position: CatalogItemFields.shape.position.default(0),
});

/** A catalog item from one of the caller's spaces, else NOT_FOUND. */
async function requireItem(db: PrismaClient, userId: string, id: string) {
  const item = await db.catalogItem.findUnique({ where: { id } });
  return requireRowScope(db, userId, item, 'Catalog item not found');
}

export const catalogRouter = router({
  list: memberProcedure
    .input(
      z.object({
        spaceId: z.string().optional(),
        includeArchived: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input.spaceId);
      return ctx.db.catalogItem.findMany({
        where: { ...scopeWhere(scope), ...(input.includeArchived ? {} : { active: true }) },
        orderBy: [{ category: 'asc' }, { pack: 'asc' }, { position: 'asc' }, { name: 'asc' }],
      });
    }),

  create: memberProcedure
    .input(CreateCatalogItemInput)
    .mutation(async ({ input, ctx }) => {
      const { spaceId, ...data } = input;
      const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId);
      return ctx.db.catalogItem.create({ data: { ...data, spaceId: scopeSpaceId(scope) } });
    }),

  update: memberProcedure
    .input(z.object({ id: z.string().min(1), data: CatalogItemFields.partial() }))
    .mutation(async ({ input, ctx }) => {
      const item = await requireItem(ctx.db, ctx.user.id, input.id);
      return ctx.db.catalogItem.update({ where: { id: item.id }, data: input.data });
    }),

  delete: memberProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const item = await requireItem(ctx.db, ctx.user.id, input.id);
      await ctx.db.catalogItem.delete({ where: { id: item.id } });
      return { success: true };
    }),
});
