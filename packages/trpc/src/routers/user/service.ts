import { TRPCError } from '@trpc/server';
import { type PrismaClient } from '@repo/database';

export const userService = {
  getProfile: async (db: PrismaClient, userId: string) => {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

    return user;
  },
};

export default userService;
