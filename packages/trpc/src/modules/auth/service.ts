import { TRPCError } from '@trpc/server';
import { UserRole, type PrismaClient } from '@repo/types';
import type { AuthManager } from '@repo/auth';
import type { LoginInput, RegisterInput, SessionUser } from '@repo/auth-shared';

const mapToSessionUser = (user: any): SessionUser => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  avatarUrl: user.avatar?.url || null,
  coverImageUrl: user.coverImage?.url || null,
});

const userSelection = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  password: true,
  role: true,
  avatar: {
    select: { url: true },
  },
  coverImage: {
    select: { url: true },
  },
};

const createSessionWithTokens = async (
  db: PrismaClient,
  auth: AuthManager,
  sessionUser: SessionUser,
  meta?: { ipAddress?: string; userAgent?: string }
) => {
  const token = await auth.createToken(sessionUser);
  const refresh = await auth.createRefreshToken(sessionUser.id);

  await db.session.create({
    data: {
      id: crypto.randomUUID(),
      userId: sessionUser.id,
      token: refresh.token,
      expiresAt: refresh.expiresAt,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });

  return { token, refreshToken: refresh.token, user: sessionUser };
};

export const authService = {
  login: async (
    db: PrismaClient,
    auth: AuthManager,
    input: LoginInput,
    meta?: { ipAddress?: string; userAgent?: string }
  ) => {
    const user = await db.user.findUnique({
      where: { email: input.email },
      select: userSelection,
    });

    if (!user || !(await auth.verifyPassword(input.password, user.password))) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    const sessionUser = mapToSessionUser(user);
    return createSessionWithTokens(db, auth, sessionUser, meta);
  },

  register: async (
    db: PrismaClient,
    auth: AuthManager,
    input: RegisterInput,
    meta?: { ipAddress?: string; userAgent?: string }
  ) => {
    const exists = await db.user.findUnique({ where: { email: input.email } });
    if (exists) {
      throw new TRPCError({ code: 'CONFLICT', message: 'This email is already in use' });
    }

    const passwordHash = await auth.hashPassword(input.password);

    const user = await db.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        password: passwordHash,
        role: UserRole.CLIENT,
      },
      include: {
        avatar: { select: { url: true } },
        coverImage: { select: { url: true } },
      },
    });

    const sessionUser = mapToSessionUser(user);
    return createSessionWithTokens(db, auth, sessionUser, meta);
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: { select: { url: true } },
        coverImage: { select: { url: true } },
      },
    });

    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
    }

    const sessionUser = mapToSessionUser(user);
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
