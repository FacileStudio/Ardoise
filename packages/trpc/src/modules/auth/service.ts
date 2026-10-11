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

export const authService = {
  login: async (db: PrismaClient, auth: AuthManager, input: LoginInput, meta?: SessionMeta) => {
    const user = await db.user.findUnique({
      where: { email: input.email },
      select: { ...sessionUserSelection, ...loginGateSelection, password: true },
    });

    if (!user || !(await auth.verifyPassword(input.password, user.password))) {
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

    await db.session.update({
      where: { id: session.id },
      data: {
        token: newRefresh.token,
        expiresAt: newRefresh.expiresAt,
        updatedAt: new Date(),
      },
    });

    return {
      token: newAccessToken,
      refreshToken: newRefresh.token,
      user: sessionUser,
    };
  },
};

export default authService;
