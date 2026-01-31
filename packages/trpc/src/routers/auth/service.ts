import { TRPCError } from '@trpc/server';
import { type PrismaClient } from '@repo/database';
import { type User, type UserEncryptedData, PrismaUser } from '@repo/types';
import { auth } from '../../lib/auth';
import type { LoginInput, RegisterInput } from '@repo/validators';
import crypto from '@repo/crypto';

export const authService = {
  login: async (input: LoginInput) => {
    try {
      const { token, user }: { token: string; user: PrismaUser } = await auth.api.signInEmail({
        body: {
          email: input.email,
          password: input.password,
        },
      });

      if (!token) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });

      if (!user || !user.isActive)
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Account is deactivated' });

      return {
        session: { token },
        user: {
          ...user,
          data: crypto.object.decrypt<UserEncryptedData>(user.encryptedData),
        } as User,
      };
    } catch (error) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }
  },

  register: async (input: RegisterInput) => {
    try {
      const hashedPassword = await crypto.hash.heavy(input.password);
      const { token, user }: { token: string | null; user: PrismaUser } =
        await auth.api.signUpEmail({
          body: {
            email: input.email,
            name: input.email,
            password: input.password,
            isActive: true,
            role: 'user',
            hashedEmail: crypto.hash.light(input.email),
            hashedPassword: hashedPassword,
            encryptedData: crypto.object.encrypt<UserEncryptedData>({
              email: input.email,
              username: input.username,
              firstName: input.firstName,
              lastName: input.lastName,
            }),
          },
        });

      if (!token || !user)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Registration failed' });

      return {
        session: { token },
        user: {
          ...user,
          data: crypto.object.decrypt<UserEncryptedData>(user.encryptedData),
        } as User,
      };
    } catch (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Registration failed' });
    }
  },

  getProfile: async (db: PrismaClient, userId: string) => {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

    return {
      ...user,
      data: crypto.object.decrypt<UserEncryptedData>(user.encryptedData),
    } as User;
  },
};
