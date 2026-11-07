import { afterAll, beforeAll } from 'bun:test';
import { lockTestDatabase } from '@repo/database/test-lock';
import { prisma } from '@repo/database';
import spaceService from '../space/service';
import revenueService from './service';
import { NOW, seedSpace, wipe, type Seed } from './test-support';

export function useSpace() {
  let release: () => Promise<void> = async () => {};
  const holder = {} as { seed: Seed };

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await wipe();
    holder.seed = await seedSpace('A');
  }, 120_000);

  afterAll(async () => {
    await wipe();
    await release();
  }, 120_000);

  return holder;
}

export async function overviewOf(userId: string, spaceId?: string) {
  const scope = await spaceService.resolveScope(prisma, userId, spaceId, 'ADMIN');
  return revenueService.overview(prisma, scope, NOW);
}

export const monthsOf = (rows: Array<{ month: string; amount: string }>) =>
  Object.fromEntries(
    rows.filter((row) => row.amount !== '0.00').map((row) => [row.month, row.amount])
  );
