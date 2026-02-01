import { router } from './context';
import contactRouter from './routers/contact/router';
import userRouter from './routers/user/router';
import stripeRouter from './routers/stripe/router';
import mediaRouter from './routers/media/router';
import chatRouter from './routers/chat/router';

export const appRouter = router({
  contact: contactRouter,
  user: userRouter,
  stripe: stripeRouter,
  media: mediaRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
export { createContext, type Context } from './context';
export { auth, type Auth } from './lib/auth';

export { stripe, STRIPE_WEBHOOK_SECRET } from './lib/stripe';
export { stripeService } from './routers/stripe/service';
