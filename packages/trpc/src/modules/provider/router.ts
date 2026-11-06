import { router, memberProcedure } from '../../trpc';
import spaceService, { scopeSpaceId as scopeSpaceIdOf, scopeWhere } from '../space/service';
import { providersOfSpace, providersOfUser } from '../space/studio';
import { parseStorageKey } from '../media/service';
import { isPlatformStaff } from '../../platform-staff';
import type { Context } from '../../context';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '@repo/database';
import { TRPCError } from '@trpc/server';

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema.optional()
  );

const ProviderInput = z.object({
  name: z.string().trim().min(1, 'Le nom du prestataire est requis'),
  legalName: emptyStringToUndefined(z.string().trim()),
  address: emptyStringToUndefined(z.string().trim()),
  city: emptyStringToUndefined(z.string().trim()),
  postalCode: emptyStringToUndefined(z.string().trim()),
  country: z.string().default('France'),
  siret: emptyStringToUndefined(z.string().trim()),
  tvaIntracom: emptyStringToUndefined(z.string().trim()),
  legalForm: emptyStringToUndefined(z.string().trim()),
  shareCapital: z.number().nonnegative().optional().nullable(),
  rcsCity: emptyStringToUndefined(z.string().trim()),
  apeCode: emptyStringToUndefined(z.string().trim()),
  email: emptyStringToUndefined(z.string().trim().email('Email invalide')),
  phone: emptyStringToUndefined(z.string().trim()),
  bankName: emptyStringToUndefined(z.string().trim()),
  iban: emptyStringToUndefined(z.string().trim()),
  bic: emptyStringToUndefined(z.string().trim()),
  logoUrl: emptyStringToUndefined(z.string().trim()),
  tvaRate: z.number().min(0, 'Le taux de TVA doit être entre 0 et 100').max(100, 'Le taux de TVA doit être entre 0 et 100').default(20),
});

/** A provider the caller may see (their spaces, plus shared ones in a studio space), else NOT_FOUND. */
async function requireProvider(db: PrismaClient, userId: string, id: string) {
  const provider = await db.provider.findFirst({ where: { AND: [{ id }, await providersOfUser(db, userId)] } });
  if (!provider) throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
  return provider;
}

/**
 * A provider the caller may change: one of their spaces', or a shared
 * (space-less) one only for platform staff, since every studio space uses it.
 */
async function requireWritableProvider(ctx: Pick<Context, 'db' | 'env'> & { user: { id: string } }, id: string) {
  const provider = await requireProvider(ctx.db, ctx.user.id, id);
  if (provider.spaceId === null && !(await isPlatformStaff(ctx.db, ctx.user.id, ctx.env))) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Shared providers are managed by Facile Studio' });
  }
  return provider;
}

/**
 * A logo must be a file the caller uploaded (uploads/<their id>/...), or the
 * one already set. Any other key could point at another space's document and
 * be downloaded through the provider.
 */
function requireOwnLogo(userId: string, logoUrl: string | undefined, current: string | null = null) {
  if (logoUrl === undefined || logoUrl === current) return;
  const key = parseStorageKey(logoUrl);
  if (!key?.startsWith(`uploads/${userId}/`) || key.split('/').includes('..')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The logo must be a file you uploaded' });
  }
}

export const providerRouter = router({
  list: memberProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        spaceId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, limit, search, spaceId } = input;
      const skip = (page - 1) * limit;

      const visible = spaceId
        ? await providersOfSpace(ctx.db, scopeSpaceIdOf(await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId)))
        : await providersOfUser(ctx.db, ctx.user.id);
      const where: Prisma.ProviderWhereInput = search
        ? {
            AND: [
              visible,
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { siret: { contains: search, mode: 'insensitive' as const } },
                ],
              },
            ],
          }
        : visible;

      const [providers, total] = await Promise.all([
        ctx.db.provider.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.db.provider.count({ where }),
      ]);

      return {
        providers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  get: memberProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const provider = await requireProvider(ctx.db, ctx.user.id, input.id);
      const scope = await spaceService.resolveScope(ctx.db, ctx.user.id);

      const documents = await ctx.db.document.findMany({
        where: { providerId: provider.id, ...scopeWhere(scope) },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return { ...provider, documents };
    }),

  create: memberProcedure
    .input(ProviderInput.extend({ spaceId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const { spaceId, ...data } = input;
      const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId);
      requireOwnLogo(ctx.user.id, data.logoUrl);
      return ctx.db.provider.create({ data: { ...data, spaceId: scopeSpaceIdOf(scope) } });
    }),

  update: memberProcedure
    .input(
      z.object({
        id: z.string(),
        data: ProviderInput.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const current = await requireWritableProvider(ctx, input.id);
      requireOwnLogo(ctx.user.id, input.data.logoUrl, current.logoUrl);

      return ctx.db.provider.update({
        where: { id: current.id },
        data: input.data,
      });
    }),

  delete: memberProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireWritableProvider(ctx, input.id);

      const [documentsCount, missionsCount] = await Promise.all([
        ctx.db.document.count({ where: { providerId: input.id } }),
        ctx.db.missionProvider.count({ where: { providerId: input.id } }),
      ]);

      if (documentsCount > 0 || missionsCount > 0) {
        const blockers = [
          documentsCount > 0 ? `${documentsCount} document(s)` : null,
          missionsCount > 0 ? `${missionsCount} mission(s)` : null,
        ].filter(Boolean);
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `This provider is still used by ${blockers.join(' and ')}. Delete or reassign them first.`,
        });
      }

      await ctx.db.provider.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
