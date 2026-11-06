import type { PrismaClient, Payment } from '@repo/database';
import type { StripeService } from '@repo/stripe';
import type { StorageService } from '@repo/storage';
import { SMTPClient, EmailTemplates } from '@repo/smtp';
import { generateReceipt, type ReceiptData } from '@repo/typst';
import { TRPCError } from '@trpc/server';
import type { ServerEnv } from '@repo/env';
import type Stripe from 'stripe';
import { Prisma } from '@repo/database';
import { cleanupTempFile, downloadStoredFileToTempPath } from '../settings/service';
import { logger } from '@repo/logger';
import { scopeWhere, requireRowScope, type Scope } from '../space/service';
import { requirePlatformStudio } from '../space/studio';
import { DEFAULT_VAT_EXEMPTION_MENTION, getSpaceSettings } from '../space/settings';
import { syncMissionPaid } from '../mission/sync';
import { isOverdue, startOfDueDay } from './overdue';
import { processPaymentEvent } from './events';
import { issuePaymentLink, revokePaymentLinks } from './link';
import { toCents } from './amounts';
import { expireCheckoutSession, notifyAttention } from './declare';
import type {
  CreatePaymentInput,
  CreateManualPaymentInput,
  SetPaymentStatusInput,
  UpdatePaymentInput,
  ListPaymentsParams,
} from './types';

const recordReceiptFailure = async (
  db: PrismaClient,
  paymentId: string,
  error: unknown
): Promise<void> => {
  try {
    await db.payment.update({
      where: { id: paymentId },
      data: {
        receiptAttempts: { increment: 1 },
        receiptError: error instanceof Error ? error.message : 'Unknown receipt error',
      },
    });
  } catch (updateError) {
    logger.error({ err: updateError }, 'Failed to record receipt failure');
  }
};

export const paymentService = {
  listPayments: async (db: PrismaClient, params: ListPaymentsParams, scope: Scope) => {
    const { page, limit, status, clientId, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = { ...scopeWhere(scope), client: scopeWhere(scope) };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await db.$transaction([
      db.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          space: { select: { id: true, name: true } },
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.payment.count({ where }),
    ]);

    return { payments, total };
  },

  paymentStats: async (db: PrismaClient, scope: Scope) => {
    const where: Prisma.PaymentWhereInput = { ...scopeWhere(scope), client: scopeWhere(scope) };
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [pending, paidThisMonth, expired] = await db.$transaction([
      db.payment.aggregate({ where: { ...where, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
      db.payment.aggregate({
        where: { ...where, status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      db.payment.count({ where: { ...where, status: 'EXPIRED' } }),
    ]);

    return {
      totalPending: Number(pending._sum.amount ?? 0),
      countPending: pending._count,
      totalPaidThisMonth: Number(paidThisMonth._sum.amount ?? 0),
      countExpired: expired,
    };
  },

  getPaymentById: async (db: PrismaClient, userId: string, id: string) => {
    const payment = await requireRowScope(
      db,
      userId,
      await db.payment.findUnique({
        where: { id },
        include: {
          invoices: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      'Payment not found'
    );

    const client = await db.client.findFirst({
      where: { id: payment.clientId, spaceId: payment.spaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const attachedDocuments = await db.paymentDocument.findMany({
      where: { paymentId: id, document: { spaceId: payment.spaceId } },
      include: { document: true },
    });

    return { ...payment, client, attachedDocuments };
  },

  listClientPayments: async (db: PrismaClient, userId: string) => {
    const client = await db.client.findUnique({ where: { userId } });

    if (!client) {
      return { payments: [], total: 0 };
    }

    const payments = await db.payment.findMany({
      where: { clientId: client.id, spaceId: client.spaceId },
      orderBy: { createdAt: 'desc' },
    });

    const owner = await db.client.findFirst({
      where: { id: client.id, spaceId: client.spaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const attachments = await db.paymentDocument.findMany({
      where: {
        paymentId: { in: payments.map((payment) => payment.id) },
        document: { spaceId: client.spaceId },
      },
      include: { document: true },
    });

    return {
      payments: payments.map((payment) => ({
        ...payment,
        client: owner,
        attachedDocuments: attachments.filter(
          (attachment) => attachment.paymentId === payment.id
        ),
      })),
      total: payments.length,
    };
  },

  createPayment: async (
    db: PrismaClient,
    userId: string,
    stripe: StripeService | null,
    smtpClient: SMTPClient | null,
    env: ServerEnv,
    appOrigin: string,
    data: CreatePaymentInput
  ): Promise<Payment> => {
    const client = await requireRowScope(
      db,
      userId,
      await db.client.findUnique({
        where: { id: data.clientId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      'Client not found'
    );
    if (data.collectionMethod === 'STRIPE') await requirePlatformStudio(db, client.spaceId);

    if (data.attachedDocumentIds && data.attachedDocumentIds.length > 0) {
      const documents = await db.document.findMany({
        where: {
          id: { in: data.attachedDocumentIds },
          spaceId: client.spaceId,
        },
        select: { id: true },
      });

      if (documents.length !== data.attachedDocumentIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more documents not found',
        });
      }
    }

    if (data.missionId) {
      const mission = await db.mission.findFirst({
        where: { id: data.missionId, clientId: client.id, spaceId: client.spaceId },
        select: { id: true },
      });

      if (!mission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Mission not found' });
      }
    }

    if (data.documentId) {
      const document = await db.document.findFirst({
        where: {
          id: data.documentId,
          spaceId: client.spaceId,
          mission: { clientId: client.id },
          ...(data.missionId ? { missionId: data.missionId } : {}),
        },
        select: { id: true },
      });

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }
    }

    const amount = toCents(data.amount) / 100;
    const clientEmail = client.contactEmail || client.user?.email || null;
    const clientName = `${client.contactFirstName} ${client.contactLastName}`.trim();
    const useStripe = data.collectionMethod === 'STRIPE';

    if (useStripe) {
      if (!stripe) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripe is not configured' });
      }
      if (!smtpClient) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'SMTP is not configured' });
      }
      if (!clientEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Client contact email is required for Stripe payments',
        });
      }
    }

    const payment = await db.payment.create({
      data: {
        clientId: data.clientId,
        spaceId: client.spaceId,
        missionId: data.missionId,
        documentId: data.documentId,
        amount,
        stripeFee: 0,
        totalWithFees: amount,
        description: data.description,
        status: 'PENDING',
        frequency: data.frequency,
        collectionMethod: data.collectionMethod,
        reference: data.reference?.trim() || null,
        dueDate: data.dueDate,
        attachedFiles: data.attachedFiles || [],
        attachedDocuments: {
          create: (data.attachedDocumentIds || []).map((documentId) => ({
            documentId,
          })),
        },
      },
      include: {
        client: {
          include: { user: { omit: { password: true } } },
        },
        attachedDocuments: {
          include: {
            document: true,
          },
        },
      },
    });

    if (useStripe && smtpClient && clientEmail) {
      try {
        const link = await issuePaymentLink(db, payment.id, env.FRONTEND_URL || appOrigin);
        const emailTemplates = new EmailTemplates(smtpClient);
        await emailTemplates.sendPaymentNotification({
          clientEmail,
          paymentLink: link.url,
          amount: Number(payment.amount),
          dueDate: payment.dueDate,
          clientName,
          invoiceNumber: payment.id,
        });
      } catch (emailError) {
        logger.error({ err: emailError }, 'Failed to send payment notification email');
      }
    }

    return payment;
  },

  updatePayment: async (
    db: PrismaClient,
    userId: string,
    id: string,
    data: Omit<UpdatePaymentInput, 'id'>,
    getStripe?: () => Promise<StripeService>
  ): Promise<Payment> => {
    const existing = await requireRowScope(
      db,
      userId,
      await db.payment.findUnique({ where: { id } }),
      'Payment not found'
    );

    const manual = existing.collectionMethod === 'MANUAL';

    if (
      manual &&
      existing.documentId &&
      data.amount !== undefined &&
      data.amount !== Number(existing.amount)
    ) {
      const linked = await db.document.findUnique({
        where: { id: existing.documentId },
        select: { source: true },
      });
      if (linked?.source === 'imported') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Edit the total on the imported document instead, the payment follows it',
        });
      }
    }

    if (existing.status === 'PAID' && !manual) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot update a payment that is already paid',
      });
    }

    if (data.amount !== undefined && !manual && existing.status !== 'PENDING') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'The amount of a Stripe payment is fixed once it has left the pending state',
      });
    }

    const updateData: Prisma.PaymentUpdateInput = {};

    if (data.paidAt !== undefined) {
      if (!manual) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Only a manual payment can be dated by hand',
        });
      }
      updateData.paidAt = data.paidAt;
    }

    if (data.amount !== undefined && manual) {
      updateData.totalWithFees = data.amount;
      updateData.stripeFee = 0;
    }

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.collectionMethod !== undefined) updateData.collectionMethod = data.collectionMethod;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.attachedFiles !== undefined) updateData.attachedFiles = data.attachedFiles;

    const amountChanged = data.amount !== undefined && data.amount !== Number(existing.amount);
    if (amountChanged && !manual && getStripe) {
      await expireCheckoutSession(getStripe, existing.stripeCheckoutSessionId);
    }

    const updated = await db.payment.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          include: { user: { omit: { password: true } } },
        },
      },
    });

    if (updated.status === 'PAID') {
      await syncMissionPaid(db, updated.missionId);
    }
    if (updated.status === 'PAID' || updated.status === 'CANCELLED') {
      await revokePaymentLinks(db, id);
    }

    return updated;
  },

  createManualPayment: async (
    db: PrismaClient,
    userId: string,
    data: CreateManualPaymentInput
  ): Promise<Payment> => {
    const { paid, paidAt, ...rest } = data;
    const payment = await paymentService.createPayment(db, userId, null, null, {} as ServerEnv, '', {
      ...rest,
      frequency: 'ONE_TIME',
      collectionMethod: 'MANUAL',
      attachedFiles: [],
      attachedDocumentIds: rest.documentId ? [rest.documentId] : [],
    });

    if (!paid) return payment;

    return paymentService.setPaymentStatus(db, userId, {
      id: payment.id,
      status: 'PAID',
      paidAt,
    });
  },

  setPaymentStatus: async (
    db: PrismaClient,
    userId: string,
    data: SetPaymentStatusInput
  ): Promise<Payment> => {
    const existing = await requireRowScope(
      db,
      userId,
      await db.payment.findUnique({ where: { id: data.id } }),
      'Payment not found'
    );

    if (existing.collectionMethod !== 'MANUAL') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Only a manual payment can be marked paid or unpaid by hand',
      });
    }

    const paid = data.status === 'PAID';

    if (!paid && existing.status !== 'PAID') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only a paid payment can be reopened',
      });
    }

    const status = paid ? 'PAID' : isOverdue(existing.dueDate) ? 'PAST_DUE' : 'PENDING';
    const updated = await db.payment.update({
      where: { id: existing.id },
      data: { status, paidAt: paid ? (data.paidAt ?? new Date()) : null },
      include: {
        client: {
          include: { user: { omit: { password: true } } },
        },
      },
    });

    if (paid) {
      await syncMissionPaid(db, updated.missionId);
      await revokePaymentLinks(db, updated.id);
    } else if (updated.missionId) {
      await db.mission.updateMany({
        where: { id: updated.missionId, status: 'PAID' },
        data: { status: 'INVOICED' },
      });
    }

    return updated;
  },

  deletePayment: async (db: PrismaClient, userId: string, id: string) => {
    const existing = await requireRowScope(
      db,
      userId,
      await db.payment.findUnique({ where: { id } }),
      'Payment not found'
    );

    if (existing.collectionMethod !== 'MANUAL') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'A Stripe payment cannot be deleted. Cancel it instead.',
      });
    }

    await db.payment.delete({ where: { id } });

    if (existing.status === 'PAID' && existing.missionId) {
      await db.mission.updateMany({
        where: { id: existing.missionId, status: 'PAID' },
        data: { status: 'INVOICED' },
      });
    }

    return { success: true };
  },

  cancelPayment: async (
    db: PrismaClient,
    userId: string,
    stripe: StripeService,
    id: string
  ): Promise<Payment> => {
    const payment = await requireRowScope(
      db,
      userId,
      await db.payment.findUnique({ where: { id } }),
      'Payment not found'
    );

    if (payment.status === 'PAID') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot cancel a payment that is already paid',
      });
    }

    if (payment.status === 'CANCELLED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Payment is already cancelled',
      });
    }

    if (payment.stripePaymentIntentId || payment.stripeSubscriptionId) {
      await requirePlatformStudio(db, payment.spaceId);
    }

    await expireCheckoutSession(async () => stripe, payment.stripeCheckoutSessionId);

    try {
      if (payment.stripePaymentIntentId) {
        await stripe.client.paymentIntents.cancel(payment.stripePaymentIntentId);
      }

      if (payment.stripeSubscriptionId) {
        await stripe.client.subscriptions.cancel(payment.stripeSubscriptionId);
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to cancel Stripe resource');
    }

    await revokePaymentLinks(db, id);
    return db.payment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        client: {
          include: { user: { omit: { password: true } } },
        },
      },
    });
  },

  sendReminder: async (
    db: PrismaClient,
    userId: string,
    smtpClient: SMTPClient,
    env: ServerEnv,
    appOrigin: string,
    paymentId: string
  ): Promise<void> => {
    const payment = await requireRowScope(
      db,
      userId,
      await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      'Payment not found'
    );
    await requirePlatformStudio(db, payment.spaceId);

    if (payment.status !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Can only send reminders for pending payments',
      });
    }

    const clientEmail = payment.client.contactEmail || payment.client.user?.email;
    if (!clientEmail) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Client has no email address configured',
      });
    }

    if (payment.lastReminderSentAt) {
      const hoursSinceLastReminder =
        (Date.now() - new Date(payment.lastReminderSentAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastReminder < 24) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Un rappel a déjà été envoyé il y a moins de 24h. Prochain envoi possible dans ${Math.ceil(24 - hoursSinceLastReminder)}h.`,
        });
      }
    }

    const clientName =
      `${payment.client.contactFirstName} ${payment.client.contactLastName}`.trim();
    const daysUntilDue = Math.ceil(
      (new Date(payment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    try {
      const link = await issuePaymentLink(db, payment.id, env.FRONTEND_URL || appOrigin);
      const emailTemplates = new EmailTemplates(smtpClient);
      await emailTemplates.sendPaymentReminder({
        clientEmail,
        paymentLink: link.url,
        amount: Number(payment.amount),
        dueDate: payment.dueDate,
        clientName,
        invoiceNumber: payment.id,
        daysUntilDue: Math.max(0, daysUntilDue),
      });
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Échec de l'envoi SMTP: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      });
    }

    await db.payment.update({
      where: { id: paymentId },
      data: {
        lastReminderSentAt: new Date(),
        reminderCount: { increment: 1 },
      },
    });
  },

  markExpiredPayments: async (db: PrismaClient, scope: Scope) => {
    const now = new Date();

    const result = await db.payment.updateMany({
      where: {
        ...scopeWhere(scope),
        status: 'PENDING',
        dueDate: { lt: startOfDueDay(now) },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return { count: result.count };
  },

  retryFailedReceipts: async (
    db: PrismaClient,
    storage: StorageService,
    smtpClient: SMTPClient,
    env: ServerEnv,
    scope: Scope,
    maxAttempts = 5
  ) => {
    const pending = await db.payment.findMany({
      where: {
        ...scopeWhere(scope),
        space: { platformStudio: true },
        status: 'PAID',
        receiptUrl: null,
        receiptAttempts: { lt: maxAttempts },
      },
      select: { id: true },
      take: 50,
    });

    let succeeded = 0;
    for (const { id } of pending) {
      try {
        await paymentService.generateAndSendReceipt(db, storage, smtpClient, env, id);
        succeeded += 1;
      } catch (error) {
        logger.error({ err: error }, 'Receipt retry failed');
        await recordReceiptFailure(db, id, error);
      }
    }

    return { attempted: pending.length, succeeded };
  },

  generateAndSendReceipt: async (
    db: PrismaClient,
    storage: StorageService,
    smtpClient: SMTPClient,
    env: ServerEnv,
    paymentId: string
  ): Promise<string> => {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: {
          include: { user: { select: { email: true } } },
        },
      },
    });

    if (!payment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'PAID') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot generate receipt for unpaid payment',
      });
    }
    await requirePlatformStudio(db, payment.spaceId);

    const settings = await db.settings.findUnique({
      where: { id: 'global' },
    });

    if (!settings) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Company settings not configured',
      });
    }

    const regime = await getSpaceSettings(db, payment.spaceId);

    const receiptData: ReceiptData = {
      receiptNumber: payment.id,
      receiptDate: payment.paidAt
        ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(payment.paidAt)
        : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date()),
      paymentMethod: 'Paiement en ligne (Stripe)',
      clientName: payment.client.companyName,
      clientAddress: payment.client.billingAddress || '',
      clientCity: payment.client.billingCity || '',
      clientCountry: payment.client.billingCountry || '',
      clientSiret: payment.client.siret || '',
      providerName: settings.companyName || '',
      providerAddress: settings.companyAddress || '',
      providerCity: settings.companyCity || '',
      providerSiret: settings.companySiret || '',
      providerEmail: settings.companyEmail || '',
      providerPhone: settings.companyPhone || '',
      items: [
        {
          description: payment.description,
          quantity: 1,
          unit: 'service',
          price: Number(payment.amount),
        },
      ],
      tvaRate: regime.vatExempt ? 0 : Number(settings.tvaRate),
      vatExempt: regime.vatExempt,
      vatExemptionMention: regime.vatExempt
        ? regime.vatExemptionMention || DEFAULT_VAT_EXEMPTION_MENTION
        : (regime.vatExemptionMention ?? ''),
    };

    let logoPath: string | undefined;

    try {
      logoPath = await downloadStoredFileToTempPath(settings.logoUrl, storage, 'receipt-logo');
      const receiptBuffer = generateReceipt(receiptData, logoPath);

      const receiptKey = `receipts/${payment.id}-${Date.now()}.pdf`;

      await storage.upload(receiptKey, receiptBuffer, 'application/pdf');

      const receiptUrl = storage.getFileUrl(receiptKey);

      const emailTemplates = new EmailTemplates(smtpClient);
      await emailTemplates.sendPaymentConfirmation({
        clientEmail: payment.client.contactEmail || payment.client.user?.email || '',
        receiptPdfBuffer: receiptBuffer,
        amount: Number(payment.amount),
        clientName: `${payment.client.contactFirstName} ${payment.client.contactLastName}`.trim(),
        paymentDate: payment.paidAt || new Date(),
        invoiceNumber: payment.id,
      });

      await db.payment.update({
        where: { id: paymentId },
        data: { receiptUrl, receiptError: null },
      });

      return receiptUrl;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to generate or send receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      cleanupTempFile(logoPath);
    }
  },

  handleWebhook: async (
    db: PrismaClient,
    storage: StorageService,
    smtpClient: SMTPClient,
    env: ServerEnv,
    event: Stripe.Event,
    getStripe?: () => Promise<StripeService>
  ) => {
    try {
      await db.webhookEvent.create({
        data: { id: event.id, type: event.type },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }

    try {
      await paymentService.processWebhookEvent(db, storage, smtpClient, env, event, getStripe);
    } catch (error) {
      await db.webhookEvent.delete({ where: { id: event.id } }).catch(() => {});
      throw error;
    }

    if (Math.random() < 0.01) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await db.webhookEvent
        .deleteMany({
          where: { processedAt: { lt: cutoff } },
        })
        .catch(() => {});
    }
  },

  processWebhookEvent: async (
    db: PrismaClient,
    storage: StorageService,
    smtpClient: SMTPClient,
    env: ServerEnv,
    event: Stripe.Event,
    getStripe?: () => Promise<StripeService>
  ) => {
    await processPaymentEvent(
      {
        db,
        cancelSubscription: async (subscriptionId) => {
          if (!getStripe) throw new Error('Stripe is not available to cancel the subscription');
          await (await getStripe()).client.subscriptions.cancel(subscriptionId);
        },
        notify: (paymentId, reason) =>
          notifyAttention(db, async () => smtpClient, paymentId, reason, env.FRONTEND_URL),
        sendReceipt: async (paymentId) => {
          try {
            await paymentService.generateAndSendReceipt(db, storage, smtpClient, env, paymentId);
          } catch (error) {
            logger.error({ err: error, event: event.type }, 'Failed to send the payment receipt');
            await recordReceiptFailure(db, paymentId, error);
          }
        },
      },
      event
    );
  },
};

export default paymentService;
