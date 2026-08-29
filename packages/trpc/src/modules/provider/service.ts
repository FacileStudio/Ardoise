import { type PrismaClient, type Prisma } from '@repo/database';
import { scopeWhere } from '../space/service';
import type { Scope } from '../space/types';

export const providerService = {
  createProvider: async (
    db: PrismaClient,
    data: Omit<Prisma.ProviderUncheckedCreateInput, 'spaceId'>,
    scope: Scope
  ) => {
    return db.provider.create({
      data: { ...data, ...scopeWhere(scope) },
    });
  },
};

export default providerService;
