import { router } from './trpc';
import { userRouter } from './modules/user/router';
import { mediaRouter } from './modules/media/router';
import { authRouter } from './modules/auth/router';
import { adminRouter } from './modules/admin/router';
import { clientRouter } from './modules/client/router';
import { paymentRouter } from './modules/payment/router';
import { settingsRouter } from './modules/settings/router';
import { documentRouter } from './modules/document/router';
import { providerRouter } from './modules/provider/router';
import { spaceRouter } from './modules/space/router';
import { missionRouter } from './modules/mission/router';
import { invitationRouter } from './modules/invitation/router';
import { magicLinkRouter } from './modules/magic-link/router';
import { createOpenApiDocument } from './openapi';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  media: mediaRouter,
  admin: adminRouter,
  client: clientRouter,
  payment: paymentRouter,
  settings: settingsRouter,
  document: documentRouter,
  provider: providerRouter,
  space: spaceRouter,
  mission: missionRouter,
  invitation: invitationRouter,
  magicLink: magicLinkRouter,
});
export const openApiDocument = createOpenApiDocument(appRouter);

export type AppRouter = typeof appRouter;

export { createContext, type Context, type CreateContextOptions } from './context';
export { publicProcedure, protectedProcedure, adminProcedure } from './trpc';
export { globalCacheFactory } from './cache';
export { paymentService } from './modules/payment/service';
export { spaceService } from './modules/space/service';
export type { Scope } from './modules/space/service';
