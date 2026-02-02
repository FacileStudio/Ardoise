import { router } from './trpc'; // Importe depuis ton fichier trpc (où t est défini)
import { contactRouter } from './modules/contact/router';
import { userRouter } from './modules/user/router';
import { stripeRouter } from './modules/stripe/router';
import { mediaRouter } from './modules/media/router';
import { chatRouter } from './modules/chat/router';
import { authRouter } from './modules/auth/router';

export const appRouter = router({
  auth: authRouter,
  contact: contactRouter,
  user: userRouter,
  stripe: stripeRouter,
  media: mediaRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;

export { stripeService } from './modules/stripe/service';
export { createContext, type Context, type CreateContextOptions } from './context';
export { publicProcedure, protectedProcedure, adminProcedure } from './trpc';
