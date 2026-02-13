import type { PrismaClient, Payment, Prisma } from '@repo/database';
import type { StripeService } from '@repo/stripe';
import type { StorageService } from '@repo/storage';
import { SMTPClient, EmailTemplates } from '@repo/smtp';
import { generateReceipt, type ReceiptData } from '@repo/typst';
import { calculateStripeFees } from '@repo/utils';
import { TRPCError } from '@trpc/server';
import type { ServerEnv } from '@repo/env';
import type Stripe from 'stripe';
import type {
  CreatePaymentInput,
  UpdatePaymentInput,
  ListPaymentsInput,
} from './types';

export const paymentService = {
  listPayments: async (db: PrismaClient, params: ListPaymentsInput) => {
    const { page, limit, status, clientId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

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

  getPaymentById: async (db: PrismaClient, id: string) => {
    const payment = await db.payment.findUnique({
      where: { id },
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
        attachedDocuments: {
          include: {
            document: true,
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
    stripe: StripeService,
    smtpClient: SMTPClient,
    env: ServerEnv,
    data: CreatePaymentInput
  ): Promise<Payment> => {
    const client = await db.client.findUnique({
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
    });

    if (!client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Client not found',
      });
    }

    if (data.attachedDocumentIds && data.attachedDocumentIds.length > 0) {
      const documents = await db.document.findMany({
        where: {
          id: { in: data.attachedDocumentIds },
        },
        select: { id: true },
      });

      if (documents.length !== data.attachedDocumentIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more documents not found',
        });
      }
    }

    const feeCalculation = calculateStripeFees(data.amount);

    let stripePaymentIntentId: string | undefined;
    let stripeSubscriptionId: string | undefined;

    try {
      if (data.frequency === 'ONE_TIME') {
        const paymentIntent = await stripe.client.paymentIntents.create({
          amount: Math.round(feeCalculation.totalWithFees * 100),
          currency: 'eur',
          metadata: {
            clientId: client.id,
            description: data.description,
          },
          automatic_payment_methods: { enabled: true },
        });
        stripePaymentIntentId = paymentIntent.id;
      } else {
        let customerId = client.stripeCustomerId;

        if (!customerId) {
          const customer = await stripe.client.customers.create({
            email: client.user.email,
            name: client.companyName,
            metadata: { clientId: client.id },
          });
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

        const price = await stripe.client.prices.create({
          currency: 'eur',
          unit_amount: Math.round(feeCalculation.totalWithFees * 100),
          recurring: {
            interval: intervalMap[data.frequency],
          },
          product_data: {
            name: data.description,
          },
        });

        const subscription = await stripe.client.subscriptions.create({
          customer: customerId,
          items: [{ price: price.id }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            clientId: client.id,
            description: data.description,
          },
        });

        stripeSubscriptionId = subscription.id;
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Stripe error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    const payment = await db.payment.create({
      data: {
        clientId: data.clientId,
        amount: feeCalculation.amount,
        stripeFee: feeCalculation.stripeFee,
        totalWithFees: feeCalculation.totalWithFees,
        description: data.description,
        status: 'PENDING',
        frequency: data.frequency,
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
          include: { user: true },
        },
        attachedDocuments: {
          include: {
            document: true,
          },
        },
      },
    });

    try {
      const emailTemplates = new EmailTemplates(smtpClient);
      await emailTemplates.sendPaymentNotification({
        clientEmail: client.user.email,
        paymentLink: `${env.FRONTEND_URL}/app/payment/${payment.id}`,
        amount: Number(payment.totalWithFees),
        dueDate: payment.dueDate,
        clientName: `${client.user.firstName} ${client.user.lastName}`,
        invoiceNumber: payment.id,
      });
    } catch (emailError) {
    }

    return payment;
  },

  updatePayment: async (
    db: PrismaClient,
    id: string,
    data: Omit<UpdatePaymentInput, 'id'>
  ): Promise<Payment> => {
    const existing = await db.payment.findUnique({ where: { id } });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Payment not found',
      });
    }

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
    if (data.attachedFiles !== undefined) updateData.attachedFiles = data.attachedFiles;

    return db.payment.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          include: { user: true },
        },
      },
    });
  },

  cancelPayment: async (
    db: PrismaClient,
    stripe: StripeService,
    id: string
  ): Promise<Payment> => {
    const payment = await db.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Payment not found',
      });
    }

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
    }

    return db.payment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        client: {
          include: { user: true },
        },
      },
    });
  },

  markExpiredPayments: async (db: PrismaClient) => {
    const now = new Date();

    const result = await db.payment.updateMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return { count: result.count };
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
          include: { user: true },
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
      clientAddress: payment.client.billingAddress,
      clientCity: payment.client.billingCity,
      clientCountry: payment.client.billingCountry,
      clientSiret: payment.client.siret || '',
      providerName: settings.companyName || env.COMPANY_NAME,
      providerAddress: settings.companyAddress || '',
      providerCity: settings.companyCity || '',
      providerSiret: settings.companySiret || '',
      providerEmail: settings.companyEmail || env.COMPANY_CONTACT_EMAIL,
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

    try {
      const receiptBuffer = generateReceipt(receiptData, env.LOGO_PATH);

      const receiptKey = `receipts/${payment.id}-${Date.now()}.pdf`;

      await storage.upload(receiptKey, receiptBuffer, 'application/pdf');

      const receiptUrl = storage.getFileUrl(receiptKey);

      await db.payment.update({
        where: { id: paymentId },
        data: { receiptUrl },
      });

      const emailTemplates = new EmailTemplates(smtpClient);
      await emailTemplates.sendPaymentConfirmation({
        clientEmail: payment.client.user.email,
        receiptPdfBuffer: receiptBuffer,
        amount: Number(payment.amount),
        clientName: `${payment.client.user.firstName} ${payment.client.user.lastName}`,
        paymentDate: payment.paidAt || new Date(),
        invoiceNumber: payment.id,
      });

      return receiptUrl;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to generate or send receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },

  handleWebhook: async (
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

        if (payment && payment.status === 'PENDING') {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              paidAt: new Date(),
            },
          });

          try {
            await paymentService.generateAndSendReceipt(
              db,
              storage,
              smtpClient,
              env,
              payment.id
            );
          } catch (error) {
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;

        if (subscriptionId && typeof subscriptionId === 'string') {
          const payment = await db.payment.findFirst({
            where: { stripeSubscriptionId: subscriptionId, status: 'PENDING' },
          });

          if (payment) {
            await db.payment.update({
              where: { id: payment.id },
              data: {
                status: 'PAID',
                paidAt: new Date(),
              },
            });

            try {
              await paymentService.generateAndSendReceipt(
                db,
                storage,
                smtpClient,
                env,
                payment.id
              );
            } catch (error) {
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await db.payment.updateMany({
          where: {
            stripeSubscriptionId: subscription.id,
            status: 'PENDING',
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
