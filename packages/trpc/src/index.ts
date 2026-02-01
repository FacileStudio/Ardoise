import { router } from './trpc';
import contactRouter from './routers/contact/router';
import userRouter from './routers/user/router';
import { stripeRouter } from './routers/stripe/router';

export const appRouter = router({
  contact: contactRouter,
  user: userRouter,
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;
export { createContext, type Context } from './context';
export { auth, type Auth } from './lib/auth';

export { stripe, STRIPE_WEBHOOK_SECRET } from './lib/stripe';
export { stripeService } from './routers/stripe/service';
