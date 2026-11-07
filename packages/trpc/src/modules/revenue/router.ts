import { router, memberProcedure } from '../../trpc';
import spaceService from '../space/service';
import revenueService from './service';
import { RevenueOverviewSchema } from './types';

export const revenueRouter = router({
  overview: memberProcedure.input(RevenueOverviewSchema).query(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input?.spaceId);
    return revenueService.overview(ctx.db, scope);
  }),
});
