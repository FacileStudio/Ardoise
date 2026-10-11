import { TRPCError } from '@trpc/server';
import type { PrismaClient, Prisma, PrestationStatus } from '@repo/database';
import type { StripeService } from '@repo/stripe';
import type { SMTPClient } from '@repo/smtp';
import type { ServerEnv } from '@repo/env';
import { paymentService } from '../payment/service';
import { scopeWhere, requireRowScope, type Scope } from '../space/service';
import type {
  CreatePrestationInput,
  UpdatePrestationInput,
  ListPrestationsParams,
  CreatePrestationPaymentInput,
  ProviderLink,
} from './types';

const TRANSITIONS: Record<PrestationStatus, PrestationStatus[]> = {
  DRAFT: ['QUOTED', 'CANCELLED'],
  QUOTED: ['DRAFT', 'ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['INVOICED', 'CANCELLED'],
  INVOICED: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

const LIVE_PAYMENT_STATUSES = ['PENDING', 'PAID', 'PAST_DUE'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PrestationPaymentDeps {
  stripe: StripeService | null;
  smtp: SMTPClient | null;
  env: ServerEnv;
  appOrigin: string;
}

async function requirePrestation(db: PrismaClient, userId: string, id: string) {
  return requireRowScope(
    db,
    userId,
    await db.prestation.findUnique({ where: { id } }),
    'Prestation not found'
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
} satisfies Prisma.PrestationInclude;

export const prestationService = {
  listPrestations: async (db: PrismaClient, params: ListPrestationsParams, scope: Scope) => {
    const { page, limit, status, clientId, search } = params;

    const where: Prisma.PrestationWhereInput = {
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

    const [prestations, total] = await Promise.all([
      db.prestation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { ...detail, _count: { select: { documents: true, payments: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.prestation.count({ where }),
    ]);

    return { prestations, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  getPrestationById: async (db: PrismaClient, userId: string, id: string) => {
    return requireRowScope(
      db,
      userId,
      await db.prestation.findUnique({
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
      'Prestation not found'
    );
  },

  createPrestation: async (db: PrismaClient, data: CreatePrestationInput, scope: Scope) => {
    const { spaceId } = scopeWhere(scope);

    await requireClient(db, data.clientId, spaceId);
    await requireProviders(db, data.providers, spaceId);

    return db.prestation.create({
      data: {
        name: data.name,
        description: data.description?.trim() || null,
        clientId: data.clientId,
        spaceId,
        providers: { create: data.providers },
      },
      include: detail,
    });
  },

  updatePrestation: async (
    db: PrismaClient,
    userId: string,
    id: string,
    data: Omit<UpdatePrestationInput, 'id'>
  ) => {
    const existing = await requirePrestation(db, userId, id);

    if (data.providers) {
      await requireProviders(db, data.providers, existing.spaceId);
    }

    return db.prestation.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description === undefined ? undefined : data.description?.trim() || null,
        providers: data.providers ? { deleteMany: {}, create: data.providers } : undefined,
      },
      include: detail,
    });
  },

  setStatus: async (db: PrismaClient, userId: string, id: string, status: PrestationStatus) => {
    const existing = await requirePrestation(db, userId, id);

    if (!TRANSITIONS[existing.status].includes(status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot move a prestation from ${existing.status} to ${status}`,
      });
    }

    return db.prestation.update({ where: { id }, data: { status }, include: detail });
  },

  attachDocument: async (db: PrismaClient, userId: string, id: string, documentId: string) => {
    const prestation = await requirePrestation(db, userId, id);

    const document = await db.document.findFirst({
      where: { id: documentId, spaceId: prestation.spaceId },
      select: { id: true, prestationId: true },
    });

    if (!document) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
    }

    if (document.prestationId && document.prestationId !== id) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Document already belongs to another prestation',
      });
    }

    return db.document.update({
      where: { id: documentId },
      data: { prestationId: id },
      select: { id: true, prestationId: true },
    });
  },

  detachDocument: async (db: PrismaClient, userId: string, id: string, documentId: string) => {
    await requirePrestation(db, userId, id);

    const document = await db.document.findFirst({
      where: { id: documentId, prestationId: id },
      select: { id: true },
    });

    if (!document) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found in this prestation' });
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
      data: { prestationId: null },
      select: { id: true, prestationId: true },
    });
  },

  createPayment: async (
    db: PrismaClient,
    userId: string,
    deps: PrestationPaymentDeps,
    input: CreatePrestationPaymentInput
  ) => {
    const prestation = await requirePrestation(db, userId, input.id);

    if (prestation.status === 'CANCELLED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Prestation is cancelled' });
    }

    const document = await db.document.findFirst({
      where: { id: input.documentId, prestationId: prestation.id },
    });

    if (!document) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found in this prestation' });
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
        clientId: prestation.clientId,
        amount: Number(document.total),
        description: `Facture ${document.invoiceNumber}`,
        reference: document.invoiceNumber,
        frequency: input.frequency,
        collectionMethod: input.collectionMethod,
        dueDate,
        attachedFiles: [],
        attachedDocumentIds: [document.id],
        prestationId: prestation.id,
        documentId: document.id,
      }
    );

    // asking for payment on an invoice is what makes an accepted prestation invoiced
    await db.prestation.updateMany({
      where: { id: prestation.id, status: 'ACCEPTED' },
      data: { status: 'INVOICED' },
    });

    return payment;
  },

  deletePrestation: async (db: PrismaClient, userId: string, id: string) => {
    await requirePrestation(db, userId, id);

    const [invoices, payments] = await Promise.all([
      db.document.count({ where: { prestationId: id, invoiceNumber: { not: null } } }),
      db.payment.count({ where: { prestationId: id } }),
    ]);

    if (invoices > 0 || payments > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot delete a prestation with invoices or payments. Cancel it instead.',
      });
    }

    await db.prestation.delete({ where: { id } });

    return { success: true };
  },
};

export default prestationService;
