import type { PrismaClient, Payment } from '@repo/database';
import type { StripeService } from '@repo/stripe';
import type { StorageService } from '@repo/storage';
import { SMTPClient, EmailTemplates } from '@repo/smtp';
import { generateReceipt, type ReceiptData } from '@repo/typst';
import { calculateStripeFees } from '@repo/utils/stripe-fees';
import { TRPCError } from '@trpc/server';
import type { ServerEnv } from '@repo/env';
import type Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@repo/database';
import { cleanupTempFile, downloadStoredFileToTempPath } from '../settings/service';
import { logger } from '@repo/logger';
import { scopeWhere, requireRowScope, type Scope } from '../space/service';
import { syncMissionPaid } from '../mission/sync';
import type { CreatePaymentInput, UpdatePaymentInput, ListPaymentsParams } from './types';

const subscriptionIdFromInvoice = (invoice: Stripe.Invoice): string | null => {
  const sub = invoice.parent?.subscription_details?.subscription;
  const id = typeof sub === 'string' ? sub : sub?.id;
  return typeof id === 'string' ? id : null;
};

const recordPaymentInvoice = async (
  db: PrismaClient,
  paymentId: string,
  invoice: Stripe.Invoice,
  status: 'PAID' | 'FAILED'
): Promise<void> => {
  if (!invoice.id) return;

  const amountCents = status === 'PAID' ? invoice.amount_paid : invoice.amount_due;
  const data = {
    amount: (amountCents ?? 0) / 100,
    status,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    paidAt: status === 'PAID' ? new Date() : null,
  };

  await db.paymentInvoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: { paymentId, stripeInvoiceId: invoice.id, ...data },
    update: data,
  });
};

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

  getPaymentByIdPublic: async (db: PrismaClient, id: string) => {
    const payment = await db.payment.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        stripeFee: true,
        totalWithFees: true,
        description: true,
        status: true,
        frequency: true,
        collectionMethod: true,
        reference: true,
        dueDate: true,
        paidAt: true,
        receiptUrl: true,
        stripeSubscriptionId: true,
        client: {
          select: {
            companyName: true,
            billingAddress: true,
            billingCity: true,
            billingCountry: true,
          },
        },
        attachedDocuments: {
          select: {
            id: true,
            document: {
              select: {
                id: true,
                name: true,
                type: true,
                invoiceNumber: true,
                quoteNumber: true,
                contractRef: true,
                pdfUrl: true,
                total: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Payment not found',
      });
    }

    return payment;
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
          ...(data.missionId ? { missionId: data.missionId } : {}),
        },
        select: { id: true },
      });

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }
    }

    const feeCalculation = calculateStripeFees(data.amount);
    const clientEmail = client.contactEmail || client.user?.email || null;
    const clientName = `${client.contactFirstName} ${client.contactLastName}`.trim();
    const useStripe = data.collectionMethod === 'STRIPE';

    let stripePaymentIntentId: string | undefined;
    let stripeSubscriptionId: string | undefined;

    if (useStripe) {
      if (!stripe) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Stripe is not configured',
        });
      }

      if (!smtpClient) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'SMTP is not configured',
        });
      }

      if (!clientEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Client contact email is required for Stripe payments',
        });
      }

      const idemBase = randomUUID();

      try {
        if (data.frequency === 'ONE_TIME') {
          const paymentIntent = await stripe.client.paymentIntents.create(
            {
              amount: Math.round(feeCalculation.totalWithFees * 100),
              currency: 'eur',
              metadata: {
                clientId: client.id,
                description: data.description,
              },
              automatic_payment_methods: { enabled: true },
            },
            { idempotencyKey: `${idemBase}-pi` }
          );
          stripePaymentIntentId = paymentIntent.id;
        } else {
          let customerId = client.stripeCustomerId;

          if (!customerId) {
            const customer = await stripe.client.customers.create(
              {
                email: clientEmail,
                name: client.companyName,
                metadata: { clientId: client.id },
              },
              { idempotencyKey: `${idemBase}-customer` }
            );
            customerId = customer.id;

            await db.client.update({
              where: { id: client.id },
              data: {
                stripeCustomerId: customerId,
              },
            });
          }

          const intervalMap = {
            MONTHLY: 'month' as const,
            YEARLY: 'year' as const,
            ONE_TIME: 'month' as const,
          };

          const price = await stripe.client.prices.create(
            {
              currency: 'eur',
              unit_amount: Math.round(feeCalculation.totalWithFees * 100),
              recurring: {
                interval: intervalMap[data.frequency],
              },
              product_data: {
                name: data.description,
              },
            },
            { idempotencyKey: `${idemBase}-price` }
          );

          const subscription = await stripe.client.subscriptions.create(
            {
              customer: customerId,
              items: [{ price: price.id }],
              payment_behavior: 'default_incomplete',
              payment_settings: { save_default_payment_method: 'on_subscription' },
              expand: ['latest_invoice.payment_intent'],
              metadata: {
                clientId: client.id,
                description: data.description,
              },
            },
            { idempotencyKey: `${idemBase}-sub` }
          );

          stripeSubscriptionId = subscription.id;
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Stripe error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    const payment = await db.payment.create({
      data: {
        clientId: data.clientId,
        spaceId: client.spaceId,
        missionId: data.missionId,
        documentId: data.documentId,
        amount: feeCalculation.amount,
        stripeFee: useStripe ? feeCalculation.stripeFee : 0,
        totalWithFees: useStripe ? feeCalculation.totalWithFees : feeCalculation.amount,
        description: data.description,
        status: 'PENDING',
        frequency: data.frequency,
        collectionMethod: data.collectionMethod,
        reference: data.reference?.trim() || null,
        dueDate: data.dueDate,
        stripePaymentIntentId,
        stripeSubscriptionId,
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
        const emailTemplates = new EmailTemplates(smtpClient);
        await emailTemplates.sendPaymentNotification({
          clientEmail,
          paymentLink: `${appOrigin}/app/payment/${payment.id}`,
          amount: Number(payment.totalWithFees),
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
    data: Omit<UpdatePaymentInput, 'id'>
  ): Promise<Payment> => {
    const existing = await requireRowScope(
      db,
      userId,
      await db.payment.findUnique({ where: { id } }),
      'Payment not found'
    );

    if (existing.status === 'PAID') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot update a payment that is already paid',
      });
    }

    const updateData: Prisma.PaymentUpdateInput = {};

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.collectionMethod !== undefined) updateData.collectionMethod = data.collectionMethod;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.attachedFiles !== undefined) updateData.attachedFiles = data.attachedFiles;

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

    return updated;
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

  createBillingPortalSession: async (
    db: PrismaClient,
    stripe: StripeService,
    paymentId: string,
    userId: string,
    returnUrl: string
  ): Promise<{ url: string }> => {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { client: true },
    });

    if (!payment) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' });
    }

    if (payment.client.userId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this payment' });
    }

    if (!payment.stripeSubscriptionId || !payment.client.stripeCustomerId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This payment has no subscription to manage',
      });
    }

    const session = await stripe.createBillingPortalSession(
      payment.client.stripeCustomerId,
      returnUrl
    );

    return { url: session.url };
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
      const emailTemplates = new EmailTemplates(smtpClient);
      await emailTemplates.sendPaymentReminder({
        clientEmail,
        paymentLink: `${appOrigin}/app/payment/${payment.id}`,
        amount: Number(payment.totalWithFees || payment.amount),
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
        dueDate: { lt: now },
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

    const settings = await db.settings.findUnique({
      where: { id: 'global' },
    });

    if (!settings) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Company settings not configured',
      });
    }

    const receiptData: ReceiptData = {
      receiptNumber: payment.id,
      receiptDate: payment.paidAt
        ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(payment.paidAt)
        : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date()),
      paymentMethod: 'Carte bancaire',
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
      tvaRate: Number(settings.tvaRate),
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
    event: Stripe.Event
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
      await paymentService.processWebhookEvent(db, storage, smtpClient, env, event);
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
    event: Stripe.Event
  ) => {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const payment = await db.payment.findUnique({
          where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (!payment) break;

        const updated = await db.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'PAID', paidAt: new Date() },
        });

        if (updated.count === 0) break;

        await syncMissionPaid(db, payment.missionId);

        try {
          await paymentService.generateAndSendReceipt(db, storage, smtpClient, env, payment.id);
        } catch (error) {
          logger.error({ err: error }, 'Failed to generate receipt for payment_intent.succeeded');
          await recordReceiptFailure(db, payment.id, error);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await db.payment.updateMany({
          where: { stripePaymentIntentId: paymentIntent.id, status: 'PENDING' },
          data: { status: 'FAILED' },
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = subscriptionIdFromInvoice(invoice);

        if (!subscriptionId) break;

        const payment = await db.payment.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (!payment) break;

        try {
          await recordPaymentInvoice(db, payment.id, invoice, 'PAID');
        } catch (error) {
          logger.error({ err: error }, 'Failed to record paid subscription invoice');
        }

        const updated = await db.payment.updateMany({
          where: { id: payment.id, status: { in: ['PENDING', 'PAST_DUE'] } },
          data: { status: 'PAID', paidAt: new Date(), stripeInvoiceId: invoice.id ?? null },
        });

        if (updated.count === 0) break;

        await syncMissionPaid(db, payment.missionId);

        try {
          await paymentService.generateAndSendReceipt(db, storage, smtpClient, env, payment.id);
        } catch (error) {
          logger.error({ err: error }, 'Failed to generate receipt for invoice.payment_succeeded');
          await recordReceiptFailure(db, payment.id, error);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = subscriptionIdFromInvoice(invoice);

        if (!subscriptionId) break;

        const payment = await db.payment.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (payment) {
          try {
            await recordPaymentInvoice(db, payment.id, invoice, 'FAILED');
          } catch (error) {
            logger.error({ err: error }, 'Failed to record failed subscription invoice');
          }
        }

        await db.payment.updateMany({
          where: {
            stripeSubscriptionId: subscriptionId,
            status: { in: ['PENDING', 'PAID', 'PAST_DUE'] },
          },
          data: { status: 'PAST_DUE', stripeInvoiceId: invoice.id ?? null },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          await db.payment.updateMany({
            where: {
              stripeSubscriptionId: subscription.id,
              status: { not: 'CANCELLED' },
            },
            data: { status: 'PAST_DUE' },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await db.payment.updateMany({
          where: {
            stripeSubscriptionId: subscription.id,
            status: { not: 'CANCELLED' },
          },
          data: {
            status: 'CANCELLED',
          },
        });
        break;
      }

      default:
    }
  },
};

export default paymentService;
