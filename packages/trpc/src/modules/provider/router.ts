import { router, adminProcedure } from '../../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const ProviderInput = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('France'),
  siret: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  logoUrl: z.string().optional(),
  tvaRate: z.number().default(20),
});

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

      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { siret: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

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
