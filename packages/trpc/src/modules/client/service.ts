import { TRPCError } from '@trpc/server';
import { type PrismaClient } from '@repo/database';
import { type AuthManager } from '@repo/auth';
import type { CreateClientInput, UpdateClientInput, ListClientsInput } from './types';

export const clientService = {
  listClients: async (db: PrismaClient, params: ListClientsInput) => {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { siret: { contains: search, mode: 'insensitive' } },
        { billingCity: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              emailVerified: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.client.count({ where }),
    ]);

    return {
      clients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  getClientById: async (db: PrismaClient, id: string) => {
    const client = await db.client.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
            status: true,
            isBanned: true,
            isSuspended: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Client not found',
      });
    }

    return client;
  },

  createClient: async (db: PrismaClient, auth: AuthManager, data: CreateClientInput) => {
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'A user with this email already exists',
      });
    }

    const hashedPassword = await auth.hashPassword(data.password);

    const client = await db.client.create({
      data: {
        companyName: data.companyName,
        billingAddress: data.billingAddress,
        billingCity: data.billingCity,
        billingCountry: data.billingCountry,
        siret: data.siret,
        user: {
          create: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            password: hashedPassword,
            role: 'CLIENT',
            emailVerified: false,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            emailVerified: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return client;
  },

  updateClient: async (db: PrismaClient, id: string, data: Omit<UpdateClientInput, 'id'>) => {
    const existingClient = await db.client.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!existingClient) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Client not found',
      });
    }

    const userUpdateData: any = {};
    if (data.firstName !== undefined) userUpdateData.firstName = data.firstName;
    if (data.lastName !== undefined) userUpdateData.lastName = data.lastName;
    if (data.email !== undefined) {
      const emailExists = await db.user.findFirst({
        where: {
          email: data.email,
          id: { not: existingClient.userId },
        },
      });

      if (emailExists) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already exists',
        });
      }

      userUpdateData.email = data.email;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await db.user.update({
        where: { id: existingClient.userId },
        data: userUpdateData,
      });
    }

    const clientUpdateData: any = {};
    if (data.companyName !== undefined) clientUpdateData.companyName = data.companyName;
    if (data.billingAddress !== undefined) clientUpdateData.billingAddress = data.billingAddress;
    if (data.billingCity !== undefined) clientUpdateData.billingCity = data.billingCity;
    if (data.billingCountry !== undefined) clientUpdateData.billingCountry = data.billingCountry;
    if (data.siret !== undefined) clientUpdateData.siret = data.siret;

    const client = await db.client.update({
      where: { id },
      data: clientUpdateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return client;
  },

  deleteClient: async (db: PrismaClient, id: string) => {
    const existingClient = await db.client.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!existingClient) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Client not found',
      });
    }

    if (existingClient.payments.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete client with existing payments. Please delete payments first or archive the client instead.',
      });
    }

    await db.client.delete({
      where: { id },
    });

    return { success: true };
  },

  getClientByUserId: async (db: PrismaClient, userId: string) => {
    const client = await db.client.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
            status: true,
            createdAt: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No client profile associated with this user',
      });
    }

    return client;
  },
};

export default clientService;
