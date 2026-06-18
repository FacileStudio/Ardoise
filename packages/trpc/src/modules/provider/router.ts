import { router, adminProcedure } from '../../trpc';
import { z } from 'zod';
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

export const providerRouter = router({
  list: adminProcedure
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

      const where: any = {};

      if (spaceId !== undefined) {
        where.spaceId = spaceId || null;
      }

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
      const provider = await ctx.db.provider.findUnique({
        where: { id: input.id },
        include: {
          documents: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
      }

      return provider;
    }),

  create: adminProcedure
    .input(ProviderInput)
    .mutation(async ({ input, ctx }) => {
      const provider = await ctx.db.provider.create({
        data: input,
      });

      return provider;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: ProviderInput.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const provider = await ctx.db.provider.update({
        where: { id: input.id },
        data: input.data,
      });

      return provider;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const documentsCount = await ctx.db.document.count({
        where: { providerId: input.id },
      });

      if (documentsCount > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot delete provider with ${documentsCount} associated documents`,
        });
      }

      await ctx.db.provider.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
