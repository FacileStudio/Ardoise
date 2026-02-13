import { TRPCError } from '@trpc/server';
import { type PrismaClient } from '@repo/database';
import { type AuthManager } from '@repo/auth';

export const userService = {
  createUser: async (
    db: PrismaClient,
    auth: AuthManager,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: 'CLIENT' | 'ADMIN';
    }
  ) => {
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User with this email already exists',
      });
    }

    const hashedPassword = await auth.hashPassword(data.password);

    return await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    });
  },

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

  getAllUsers: async (
    db: PrismaClient,
    filters?: {
      role?: 'all' | 'admin' | 'user';
    }
  ) => {
    const where: any = {};

    if (filters?.role && filters.role !== 'all') {
      where.role = filters.role.toUpperCase();
    }

    return await db.user.findMany({
      where,
      include: {
        avatar: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  getUserById: async (db: PrismaClient, userId: string) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        avatar: true,
        coverImage: true,
        client: {
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        accounts: true,
        adminPermissions: true,
        documents: true,
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

  getUserStats: async (db: PrismaClient) => {
    const [
      totalUsers,
      adminUsers,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'ADMIN' } }),
    ]);

    return {
      totalUsers,
      adminUsers,
    };
  },

  updateUser: async (
    db: PrismaClient,
    userId: string,
    data: { role?: 'CLIENT' | 'ADMIN' }
  ) => {
    try {
      return await db.user.update({
        where: { id: userId },
        data,
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user',
      });
    }
  },

  adminUpdateUser: async (
    db: PrismaClient,
    auth: AuthManager,
    userId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: 'CLIENT' | 'ADMIN';
      password?: string;
    }
  ) => {
    const updateData: any = {};

    if (data.email) {
      const existingUser = await db.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }
      updateData.email = data.email;
    }

    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.role) updateData.role = data.role;

    if (data.password) {
      updateData.password = await auth.hashPassword(data.password);
    }

    try {
      return await db.user.update({
        where: { id: userId },
        data: updateData,
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user',
      });
    }
  },


  deleteUser: async (db: PrismaClient, userId: string) => {
    return await db.user.delete({
      where: { id: userId },
    });
  },

  bulkDeleteUsers: async (db: PrismaClient, userIds: string[]) => {
    return await db.user.deleteMany({
      where: { id: { in: userIds } },
    });
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
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update profile',
      });
    }
  },

  changePassword: async (
    db: PrismaClient,
    auth: AuthManager,
    userId: string,
    currentPassword: string,
    newPassword: string
  ) => {
    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const isValid = await auth.verifyPassword(currentPassword, user.password);

    if (!isValid) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Current password is incorrect',
      });
    }

    const hashedPassword = await auth.hashPassword(newPassword);

    return await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
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
    });
  },
};

export default userService;
