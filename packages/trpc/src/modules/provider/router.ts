import { router, adminProcedure } from '../../trpc';
import spaceService, { scopeWhere } from '../space/service';
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

async function requireProvider(db: PrismaClient, id: string) {
  const provider = await db.provider.findUnique({ where: { id } });
  if (!provider) throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
  return provider;
}

export const providerRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, limit, search } = input;
      const skip = (page - 1) * limit;

      const where: Prisma.ProviderWhereInput = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { siret: { contains: search, mode: 'insensitive' as const } },
        ];
      }

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

  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const provider = await requireProvider(ctx.db, input.id);
      const scope = await spaceService.resolveScope(ctx.db, ctx.user.id);

      const documents = await ctx.db.document.findMany({
        where: { providerId: provider.id, ...scopeWhere(scope) },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return { ...provider, documents };
    }),

  create: adminProcedure
    .input(ProviderInput)
    .mutation(({ input, ctx }) => ctx.db.provider.create({ data: input })),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: ProviderInput.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireProvider(ctx.db, input.id);

      const provider = await ctx.db.provider.update({
        where: { id: input.id },
        data: input.data,
      });

      return provider;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await requireProvider(ctx.db, input.id);

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
