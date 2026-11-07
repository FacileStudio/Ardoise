import type { PrismaClient } from '@repo/database';
import type { Scope } from '../space/service';
import { collectedOverview, collectedRows } from './collected';
import { forecastOverview, forecastRows } from './forecast';
import { TIME_ZONE, spaceIdsOf } from './sql';
import { toCollectOverview, toCollectRows } from './to-collect';
import { getSpaceSettings } from '../space/settings';
import type { RevenueOverview } from './types';

export const revenueService = {
  overview: async (
    db: PrismaClient,
    scope: Scope,
    now: Date = new Date()
  ): Promise<RevenueOverview> => {
    const spaceIds = spaceIdsOf(scope);
    const [settings, collected, toCollect, forecast] = await Promise.all([
      Promise.all(spaceIds.map((id) => getSpaceSettings(db, id))),
      collectedRows(db, spaceIds, now),
      toCollectRows(db, spaceIds, now),
      forecastRows(db, spaceIds, now),
    ]);

    return {
      currency: 'EUR',
      timeZone: TIME_ZONE,
      taxLabel: settings.length > 0 && settings.every((row) => row.vatExempt) ? null : 'TTC',
      collected: collectedOverview(collected, now),
      toCollect: toCollectOverview(toCollect),
      forecast: forecastOverview(forecast, now),
    };
  },
};

export default revenueService;
