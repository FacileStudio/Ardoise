import type { PrismaClient } from '@repo/database';
import type { Scope } from '../space/service';
import { collectedOverview, collectedRows } from './collected';
import { forecastOverview, forecastRows } from './forecast';
import { TIME_ZONE, spaceIdsOf } from './sql';
import { toCollectOverview, toCollectRows } from './to-collect';
import type { RevenueOverview } from './types';

export const revenueService = {
  overview: async (
    db: PrismaClient,
    scope: Scope,
    now: Date = new Date()
  ): Promise<RevenueOverview> => {
    const spaceIds = spaceIdsOf(scope);
    const [collected, toCollect, forecast] = await Promise.all([
      collectedRows(db, spaceIds, now),
      toCollectRows(db, spaceIds, now),
      forecastRows(db, spaceIds, now),
    ]);

    return {
      currency: 'EUR',
      timeZone: TIME_ZONE,
      collected: collectedOverview(collected, now),
      toCollect: toCollectOverview(toCollect),
      forecast: forecastOverview(forecast, now),
    };
  },
};

export default revenueService;
