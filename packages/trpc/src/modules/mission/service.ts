import { TRPCError } from '@trpc/server';
import type {
  PrismaClient,
  Prisma,
  MissionStatus,
  MissionProviderRole,
} from '@repo/database';
import type { StripeService } from '@repo/stripe';
import type { SMTPClient } from '@repo/smtp';
import type { ServerEnv } from '@repo/env';
import { paymentService } from '../payment/service';
import { scopeWhere, requireRowScope, type Scope } from '../space/service';
import type {
  CreateMissionInput,
  UpdateMissionInput,
  ListMissionsParams,
  CreateMissionPaymentInput,
  ProviderLink,
} from './types';

const TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  DRAFT: ['QUOTED', 'CANCELLED'],
  QUOTED: ['DRAFT', 'ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['INVOICED', 'CANCELLED'],
  INVOICED: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

const LIVE_PAYMENT_STATUSES = ['PENDING', 'PAID', 'PAST_DUE'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MissionPaymentDeps {
  stripe: StripeService | null;
  smtp: SMTPClient | null;
  env: ServerEnv;
  appOrigin: string;
}

async function requireMission(db: PrismaClient, userId: string, id: string) {
  return requireRowScope(
    db,
    userId,
    await db.mission.findUnique({ where: { id } }),
    'Mission not found'
  );
}

async function requireClient(db: PrismaClient, clientId: string, spaceId: string | null) {
  const client = await db.client.findFirst({ where: { id: clientId, spaceId } });

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
  }

  return client;
}

async function requireProviders(db: PrismaClient, links: ProviderLink[], spaceId: string | null) {
  const ids = links.map((link) => link.providerId);

  if (new Set(ids).size !== ids.length) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'A provider can only be linked once' });
  }

  if (ids.length === 0) return;

  const found = await db.provider.count({ where: { id: { in: ids }, spaceId } });

  if (found !== ids.length) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'One or more providers not found' });
  }
}

// the web typecheck reads this file without strictNullChecks, where zod makes every key optional
const providerRows = (links: ProviderLink[]) =>
  links.map((link) => ({
    providerId: link.providerId as string,
    role: link.role as MissionProviderRole,
  }));

const detail = {
  client: {
    select: {
      id: true,
      companyName: true,
      contactFirstName: true,
      contactLastName: true,
      contactEmail: true,
    },
  },
  providers: { include: { provider: { select: { id: true, name: true, legalName: true } } } },
} satisfies Prisma.MissionInclude;

export const missionService = {
  listMissions: async (db: PrismaClient, params: ListMissionsParams, scope: Scope) => {
    const { page, limit, status, clientId, search } = params;

    const where: Prisma.MissionWhereInput = {
      ...scopeWhere(scope),
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [missions, total] = await Promise.all([
      db.mission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { ...detail, _count: { select: { documents: true, payments: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.mission.count({ where }),
    ]);

    return { missions, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getMissionById: async (db: PrismaClient, userId: string, id: string) => {
    return requireRowScope(
      db,
      userId,
      await db.mission.findUnique({
        where: { id },
        include: {
          ...detail,
          documents: {
            select: {
              id: true,
              type: true,
              name: true,
              invoiceNumber: true,
              quoteNumber: true,
              contractRef: true,
              total: true,
              pdfUrl: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
              totalWithFees: true,
              collectionMethod: true,
              dueDate: true,
              paidAt: true,
              documentId: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      'Mission not found'
    );
  },

  createMission: async (db: PrismaClient, data: CreateMissionInput, scope: Scope) => {
    const { spaceId } = scopeWhere(scope);

    await requireClient(db, data.clientId, spaceId);
    await requireProviders(db, data.providers, spaceId);

    return db.mission.create({
      data: {
        name: data.name,
        description: data.description?.trim() || null,
        clientId: data.clientId,
        spaceId,
        providers: { create: providerRows(data.providers) },
      },
      include: detail,
    });
  },

  updateMission: async (
    db: PrismaClient,
    userId: string,
    id: string,
    data: Omit<UpdateMissionInput, 'id'>
  ) => {
    const existing = await requireMission(db, userId, id);

    if (data.providers) {
      await requireProviders(db, data.providers, existing.spaceId);
    }

    return db.mission.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description === undefined ? undefined : data.description?.trim() || null,
        providers: data.providers
          ? { deleteMany: {}, create: providerRows(data.providers) }
          : undefined,
      },
      include: detail,
    });
  },

  setStatus: async (db: PrismaClient, userId: string, id: string, status: MissionStatus) => {
    const existing = await requireMission(db, userId, id);

    if (!TRANSITIONS[existing.status].includes(status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot move a mission from ${existing.status} to ${status}`,
      });
    }

    return db.mission.update({ where: { id }, data: { status }, include: detail });
  },

  attachDocument: async (db: PrismaClient, userId: string, id: string, documentId: string) => {
    const mission = await requireMission(db, userId, id);

    const document = await db.document.findFirst({
      where: { id: documentId, spaceId: mission.spaceId },
      select: { id: true, missionId: true },
    });

    if (!document) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
    }

    if (document.missionId && document.missionId !== id) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Document already belongs to another mission',
      });
    }

    return db.document.update({
      where: { id: documentId },
      data: { missionId: id },
      select: { id: true, missionId: true },
    });
  },

  detachDocument: async (db: PrismaClient, userId: string, id: string, documentId: string) => {
    await requireMission(db, userId, id);

    const document = await db.document.findFirst({
      where: { id: documentId, missionId: id },
      select: { id: true },
    });

    if (!document) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found in this mission' });
    }

    const settled = await db.payment.count({
      where: { documentId, status: { in: [...LIVE_PAYMENT_STATUSES] } },
    });

    if (settled > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This document has a live payment. Cancel the payment first.',
      });
    }

    return db.document.update({
      where: { id: documentId },
      data: { missionId: null },
      select: { id: true, missionId: true },
    });
  },

  createPayment: async (
    db: PrismaClient,
    userId: string,
    deps: MissionPaymentDeps,
    input: CreateMissionPaymentInput
  ) => {
    const mission = await requireMission(db, userId, input.id);

    if (mission.status === 'CANCELLED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Mission is cancelled' });
    }

    const document = await db.document.findFirst({
      where: { id: input.documentId, missionId: mission.id },
    });

    if (!document) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found in this mission' });
    }

    if (!document.invoiceNumber) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only an invoice can be paid' });
    }

    const live = await db.payment.findFirst({
      where: { documentId: document.id, status: { in: [...LIVE_PAYMENT_STATUSES] } },
      select: { id: true },
    });

    if (live) {
      throw new TRPCError({ code: 'CONFLICT', message: 'This invoice already has a payment' });
    }

    // the payment term starts when the payment is requested, not when the invoice was issued
    const dueDate = input.dueDate ?? new Date(Date.now() + document.paymentTermsDays * DAY_MS);

    const payment = await paymentService.createPayment(
      db,
      userId,
      deps.stripe,
      deps.smtp,
      deps.env,
      deps.appOrigin,
      {
        clientId: mission.clientId,
        amount: Number(document.total),
        description: `Facture ${document.invoiceNumber}`,
        reference: document.invoiceNumber,
        frequency: input.frequency,
        collectionMethod: input.collectionMethod,
        dueDate,
        attachedFiles: [],
        attachedDocumentIds: [document.id],
        missionId: mission.id,
        documentId: document.id,
      }
    );

    // asking for payment on an invoice is what makes an accepted mission invoiced
    await db.mission.updateMany({
      where: { id: mission.id, status: 'ACCEPTED' },
      data: { status: 'INVOICED' },
    });

    return payment;
  },

  deleteMission: async (db: PrismaClient, userId: string, id: string) => {
    await requireMission(db, userId, id);

    const [invoices, payments] = await Promise.all([
      db.document.count({ where: { missionId: id, invoiceNumber: { not: null } } }),
      db.payment.count({ where: { missionId: id } }),
    ]);

    if (invoices > 0 || payments > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete a mission with invoices or payments. Cancel it instead.',
      });
    }

    await db.mission.delete({ where: { id } });

    return { success: true };
  },
};

export default missionService;
