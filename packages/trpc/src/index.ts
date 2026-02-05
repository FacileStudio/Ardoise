import { router } from './trpc';
import { contactRouter } from './modules/contact/router';
import { userRouter } from './modules/user/router';
import { stripeRouter } from './modules/stripe/router';
import { mediaRouter } from './modules/media/router';
import { chatRouter } from './modules/chat/router';
import { authRouter } from './modules/auth/router';
import { adminRouter } from './modules/admin/router';
import { createOpenApiDocument } from './openapi';

export const appRouter = router({
  auth: authRouter,
  contact: contactRouter,
  user: userRouter,
  stripe: stripeRouter,
  media: mediaRouter,
  chat: chatRouter,
  admin: adminRouter,
});
export const openApiDocument = createOpenApiDocument(appRouter);

export type AppRouter = typeof appRouter;

export { stripeService } from './modules/stripe/service';
export { createContext, type Context, type CreateContextOptions } from './context';
export { publicProcedure, protectedProcedure, adminProcedure } from './trpc';
export { globalCacheFactory } from './cache';
