import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/types';
import type { AuthManager } from '@repo/auth';
import {
  loginBlockReason,
  loginGateSelection,
  sessionUserSelection,
  toSessionUser,
} from './session';

const assertCanLogin = (user: Parameters<typeof loginBlockReason>[0]) => {
  const reason = loginBlockReason(user);
  if (reason) throw new TRPCError({ code: 'FORBIDDEN', message: reason });
};

export const authService = {
  me: async (db: PrismaClient, userId: string) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: sessionUserSelection,
    });
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
    }
    return toSessionUser(user);
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
