import { router } from './trpc';
import { contactRouter } from './routers/contact/router';
import { authRouter } from './routers/auth/router';

export const appRouter = router({
  contact: contactRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
export { createContext, type Context } from './context';
export { verifyToken, generateToken, hashPassword, comparePassword } from './lib/jwt';
export type { JwtPayload } from './lib/jwt';
export { auth } from './lib/auth';
export type { Auth } from './lib/auth';
