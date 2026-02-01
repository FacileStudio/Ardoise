import { TRPCError } from '@trpc/server';
import { type PrismaClient } from '@repo/database';

export const userService = {
  getProfile: async (db: PrismaClient, userId: string) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        avatar: true,
        coverImage: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  },

  getAllUsers: async (db: PrismaClient) => {
    return await db.user.findMany({
      include: {
        avatar: true,
        messages: { select: { id: true } },
        rooms: { select: { roomId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  updateUser: async (
    db: PrismaClient,
    userId: string,
    data: { isPremium?: boolean; role?: string }
  ) => {
    try {
      return await db.user.update({
        where: { id: userId },
        data,
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour de l’utilisateur',
      });
    }
  },

  deleteUser: async (db: PrismaClient, userId: string) => {
    return await db.user.delete({
      where: { id: userId },
    });
  },
};

export default userService;
