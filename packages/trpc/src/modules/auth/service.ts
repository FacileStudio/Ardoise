import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/types';
import type { AuthManager } from '@repo/auth';
import type { LoginInput } from '@repo/auth-shared';
import {
  issueSession,
  loginBlockReason,
  loginGateSelection,
  sessionUserSelection,
  toSessionUser,
  type SessionMeta,
} from './session';

const assertCanLogin = (user: Parameters<typeof loginBlockReason>[0]) => {
  const reason = loginBlockReason(user);
  if (reason) throw new TRPCError({ code: 'FORBIDDEN', message: reason });
};

const decoyHashes = new WeakMap<AuthManager, Promise<string>>();

/**
 * A real password hash that matches nothing, so refused logins pay the same
 * verification cost as a wrong password.
 */
const decoyHash = (auth: AuthManager) => {
  let hash = decoyHashes.get(auth);
  if (!hash) {
    hash = auth.hashPassword(crypto.randomUUID());
    decoyHashes.set(auth, hash);
  }
  return hash;
};

export interface LoginOptions {
  ssoOnly?: boolean;
}

export const authService = {
  /**
   * Password login. CLIENT users sign in with a magic link and are always
   * refused. With `ssoOnly`, every other user is refused too. A refusal returns
   * the same error and costs the same hashing work as a wrong password.
   */
  login: async (
    db: PrismaClient,
    auth: AuthManager,
    input: LoginInput,
    meta?: SessionMeta,
    options: LoginOptions = {}
  ) => {
    const user = await db.user.findUnique({
      where: { email: input.email },
      select: { ...sessionUserSelection, ...loginGateSelection, password: true },
    });

    const refused =
      !user || !user.password || user.role === 'CLIENT' || options.ssoOnly === true;
    const hash = user?.password && !refused ? user.password : await decoyHash(auth);
    const valid = await auth.verifyPassword(input.password, hash);

    if (!user || refused || !valid) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    assertCanLogin(user);
    return issueSession(db, auth, toSessionUser(user), meta);
  },

  refresh: async (db: PrismaClient, auth: AuthManager, refreshToken: string) => {
    const payload = await auth.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid refresh token' });
    }

    const session = await db.session.findUnique({
      where: { token: refreshToken },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await db.session.deleteMany({ where: { userId: session.userId } });
      }
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Refresh token expired or revoked' });
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { ...sessionUserSelection, ...loginGateSelection },
    });

    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
    }

    assertCanLogin(user);

    const sessionUser = toSessionUser(user);
    const newAccessToken = await auth.createToken(sessionUser);
    const newRefresh = await auth.createRefreshToken(sessionUser.id);

    const rotated = await db.session.updateMany({
      where: { id: session.id, token: refreshToken },
      data: {
        token: newRefresh.token,
        expiresAt: newRefresh.expiresAt,
        updatedAt: new Date(),
      },
    });

    if (rotated.count === 0) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Refresh token expired or revoked' });
    }

    return {
      token: newAccessToken,
      refreshToken: newRefresh.token,
      user: sessionUser,
    };
  },
};

export default authService;
