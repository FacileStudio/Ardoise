import { TRPCError } from '@trpc/server';
import { type PrismaClient } from '@repo/database';

const NO_PASSWORD = { password: true } as const;

export const userService = {
  getProfile: async (db: PrismaClient, userId: string) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        avatar: true,
        coverImage: true,
      },
      omit: NO_PASSWORD,
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  },

  updateProfile: async (
    db: PrismaClient,
    userId: string,
    data: { firstName?: string; lastName?: string }
  ) => {
    try {
      return await db.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
        omit: NO_PASSWORD,
      });
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update profile',
      });
    }
  },

  deleteOwnAccount: async (db: PrismaClient, userId: string) => {
    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return await db.user.delete({
      where: { id: userId },
      omit: NO_PASSWORD,
    });
  },
};

export default userService;
