import { TRPCError } from '@trpc/server';
import { type Prisma, type PrismaClient } from '@repo/database';
import { scopeWhere, scopeConnect, requireRowScope, type Scope } from '../space/service';
import type {
  CreateClientInput,
  UpdateClientInput,
  ListClientsParams,
  TransferClientInput,
} from './types';

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const clientService = {
  listClients: async (db: PrismaClient, params: ListClientsParams, scope: Scope) => {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = { ...scopeWhere(scope) };

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { siret: { contains: search, mode: 'insensitive' } },
        { billingCity: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { contactFirstName: { contains: search, mode: 'insensitive' } },
        { contactLastName: { contains: search, mode: 'insensitive' } },
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

  getClientById: async (db: PrismaClient, userId: string, id: string) => {
    const client = await requireRowScope(
      db,
      userId,
      await db.client.findUnique({
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
        },
      }),
      'Client not found'
    );

    const payments = await db.payment.findMany({
      where: { clientId: id, spaceId: client.spaceId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { ...client, payments };
  },

  createClient: async (db: PrismaClient, data: CreateClientInput, scope: Scope) => {
    const credentialEmail = data.credentialEmail?.trim();

    if (data.createCredentials) {
      if (!credentialEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Credential email is required when creating client access',
        });
      }

      const existingUser = await db.user.findUnique({
        where: { email: credentialEmail },
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A user with this email already exists',
        });
      }
    }

    const userData = data.createCredentials
      ? {
          create: {
            email: credentialEmail!,
            firstName: data.contactFirstName,
            lastName: data.contactLastName,
            role: 'CLIENT' as const,
            emailVerified: false,
          },
        }
      : undefined;

    const client = await db.client.create({
      data: {
        ...scopeConnect(scope),
        contactFirstName: data.contactFirstName,
        contactLastName: data.contactLastName,
        contactEmail: normalizeOptional(data.contactEmail),
        companyName: data.companyName,
        billingAddress: normalizeOptional(data.billingAddress),
        billingCity: normalizeOptional(data.billingCity),
        billingPostalCode: normalizeOptional(data.billingPostalCode),
        billingCountry: normalizeOptional(data.billingCountry),
        siret: data.siret,
        tvaIntracom: normalizeOptional(data.tvaIntracom),
        user: userData,
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

  updateClient: async (
    db: PrismaClient,
    userId: string,
    id: string,
    data: Omit<UpdateClientInput, 'id'>
  ) => {
    const existingClient = await requireRowScope(
      db,
      userId,
      await db.client.findUnique({
        where: { id },
      }),
      'Client not found'
    );

    const userUpdateData: Prisma.UserUpdateInput = {};
    if (existingClient.userId && data.contactFirstName !== undefined) userUpdateData.firstName = data.contactFirstName;
    if (existingClient.userId && data.contactLastName !== undefined) userUpdateData.lastName = data.contactLastName;
    if (existingClient.userId && data.contactEmail !== undefined && data.contactEmail !== '') {
      const emailExists = await db.user.findFirst({
        where: {
          email: data.contactEmail,
          id: { not: existingClient.userId },
        },
      });

      if (emailExists) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already exists',
        });
      }

      userUpdateData.email = data.contactEmail;
    }

    const clientUpdateData: Prisma.ClientUpdateInput = {};
    if (data.contactFirstName !== undefined) clientUpdateData.contactFirstName = data.contactFirstName;
    if (data.contactLastName !== undefined) clientUpdateData.contactLastName = data.contactLastName;
    if (data.contactEmail !== undefined) clientUpdateData.contactEmail = normalizeOptional(data.contactEmail);
    if (data.companyName !== undefined) clientUpdateData.companyName = data.companyName;
    if (data.billingAddress !== undefined) clientUpdateData.billingAddress = data.billingAddress;
    if (data.billingCity !== undefined) clientUpdateData.billingCity = data.billingCity;
    if (data.billingPostalCode !== undefined) clientUpdateData.billingPostalCode = data.billingPostalCode;
    if (data.billingCountry !== undefined) clientUpdateData.billingCountry = data.billingCountry;
    if (data.siret !== undefined) clientUpdateData.siret = data.siret;
    if (data.tvaIntracom !== undefined) clientUpdateData.tvaIntracom = data.tvaIntracom;

    const client = await db.$transaction(async (tx) => {
      if (existingClient.userId && Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existingClient.userId },
          data: userUpdateData,
        });
      }

      return tx.client.update({
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
    });

    return client;
  },

  transferClient: async (
    db: PrismaClient,
    userId: string,
    input: TransferClientInput,
    target: Scope
  ) => {
    const source = await requireRowScope(
      db,
      userId,
      await db.client.findUnique({
        where: { id: input.id },
        include: { _count: { select: { missions: true, payments: true } } },
      }),
      'Client not found'
    );

    const targetSpaceId = target.type === 'space' ? target.spaceId : null;
    if (source.spaceId === targetSpaceId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client is already in this space' });
    }

    // history stays in the source space, so a client that has any can only be copied
    const hasHistory = source._count.missions > 0 || source._count.payments > 0;
    if (input.mode === 'move' && !hasHistory) {
      const client = await db.client.update({
        where: { id: source.id },
        data: { spaceId: targetSpaceId },
      });
      return { client, relocated: true };
    }

    const client = await db.client.create({
      data: {
        ...scopeConnect(target),
        contactFirstName: source.contactFirstName,
        contactLastName: source.contactLastName,
        contactEmail: source.contactEmail,
        companyName: source.companyName,
        billingAddress: source.billingAddress,
        billingCity: source.billingCity,
        billingPostalCode: source.billingPostalCode,
        billingCountry: source.billingCountry,
        siret: source.siret,
        tvaIntracom: source.tvaIntracom,
      },
    });
    return { client, relocated: false };
  },

  deleteClient: async (db: PrismaClient, userId: string, id: string) => {
    const existingClient = await requireRowScope(
      db,
      userId,
      await db.client.findUnique({
        where: { id },
        include: {
          payments: { select: { id: true } },
        },
      }),
      'Client not found'
    );

    const missions = await db.mission.count({ where: { clientId: id } });
    const payments = existingClient.payments.length;

    if (payments > 0 || missions > 0) {
      const blockers = [
        missions > 0 ? `${missions} mission(s)` : null,
        payments > 0 ? `${payments} payment(s)` : null,
      ].filter(Boolean);
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `This client still has ${blockers.join(' and ')}. Delete them first.`,
      });
    }

    await db.client.delete({
      where: { id },
    });

    return { success: true, gloutonCompanyId: existingClient.gloutonCompanyId };
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
