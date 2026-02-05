import { StripeService as StripeLib } from '@repo/stripe';
import { PrismaClient } from '@repo/database';
import type Stripe from 'stripe';

export const stripeService = {
  createCheckoutSession: async (
    db: PrismaClient,
    stripe: StripeLib,
    userId: string,
    priceId: string,
    frontendUrl: string
  ) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) throw new Error('User not found');
    if (user.subscription?.status === 'active') {
      throw new Error('You already have an active subscription');
    }

    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.client.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;

      await db.subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: customerId,
          status: 'incomplete',
        },
        update: {
          stripeCustomerId: customerId,
        },
      });
    }

    const session = await stripe.client.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/app/premium/success`,
      cancel_url: `${frontendUrl}/app/premium?canceled=true`,
      metadata: { userId },
    });

    return { sessionId: session.id, url: session.url };
  },

  createPortalSession: async (
    db: PrismaClient,
    stripe: StripeLib,
    userId: string,
    frontendUrl: string
  ) => {
    const subscription = await db.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new Error('No subscription found');
    }

    const session = await stripe.client.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/app/premium`,
    });

    return { url: session.url };
  },

  getSubscription: async (db: PrismaClient, userId: string) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) throw new Error('User not found');
    if (!user.subscription) return { hasSubscription: false, isPremium: false };

    return {
      hasSubscription: true,
      isPremium: true,
      subscription: {
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
      },
    };
  },

  syncSubscription: async (db: PrismaClient, stripe: StripeLib, userId: string) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user || !user.subscription?.stripeCustomerId) {
      throw new Error('User or Stripe customer not found');
    }

    const subscriptions = await stripe.client.subscriptions.list({
      customer: user.subscription.stripeCustomerId,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      await db.$transaction([
        db.subscription.update({
          where: { userId },
          data: {
            status: 'canceled',
            stripeSubscriptionId: null,
            planId: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          },
        }),
        db.user.update({
          where: { id: userId },
          data: { isPremium: false },
        }),
      ]);
      return { success: true, isPremium: false, status: 'canceled' };
    }

    const sub = subscriptions.data[0]!;
    const isActive = sub.status === 'active' || sub.status === 'trialing';
    const periodEnd = sub.items.data[0]?.current_period_end;

    await db.$transaction([
      db.subscription.update({
        where: { userId },
        data: {
          stripeSubscriptionId: sub.id,
          status: sub.status,
          planId: sub.items.data[0]?.price.id,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      }),
      db.user.update({
        where: { id: userId },
        data: { isPremium: isActive },
      }),
    ]);

    return { success: true, isPremium: isActive, status: sub.status };
  },

  handleWebhook: async (
    db: PrismaClient,
    stripe: StripeLib,
    rawBody: string,
    signature: string
  ) => {
    const event = await stripe.constructEvent(rawBody, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId && session.mode === 'subscription' && session.subscription) {
          const subscriptionId = session.subscription as string;
          const sub = await stripe.client.subscriptions.retrieve(subscriptionId);
          const periodEnd = sub.items.data[0]?.current_period_end;

          await db.$transaction([
            db.subscription.upsert({
              where: { userId },
              create: {
                userId,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscriptionId,
                status: sub.status,
                planId: sub.items.data[0]?.price.id,
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
              },
              update: {
                stripeSubscriptionId: subscriptionId,
                status: sub.status,
                planId: sub.items.data[0]?.price.id,
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
              },
            }),
            db.user.update({
              where: { id: userId },
              data: { isPremium: true },
            }),
          ]);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const existing = await db.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (existing) {
          const isActive = sub.status === 'active' || sub.status === 'trialing';
          const periodEnd = sub.items.data[0]?.current_period_end;

          await db.$transaction([
            db.subscription.update({
              where: { stripeCustomerId: customerId },
              data: {
                status: sub.status,
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
                cancelAtPeriodEnd: sub.cancel_at_period_end,
              },
            }),
            db.user.update({
              where: { id: existing.userId },
              data: { isPremium: isActive },
            }),
          ]);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const existing = await db.subscription.findUnique({
          where: { stripeCustomerId: sub.customer as string },
        });

        if (existing) {
          await db.$transaction([
            db.subscription.update({
              where: { stripeCustomerId: sub.customer as string },
              data: {
                status: 'canceled',
                currentPeriodEnd: null,
                stripeSubscriptionId: null,
                planId: null,
                cancelAtPeriodEnd: false,
              },
            }),
            db.user.update({
              where: { id: existing.userId },
              data: { isPremium: false },
            }),
          ]);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const existing = await db.subscription.findUnique({
          where: { stripeCustomerId: invoice.customer as string },
        });

        const rawInvoice = invoice as any;
        const paymentIntentId =
          typeof rawInvoice.payment_intent === 'string'
            ? rawInvoice.payment_intent
            : rawInvoice.payment_intent?.id;

        if (existing && paymentIntentId) {
          await db.paymentHistory.create({
            data: {
              userId: existing.userId,
              stripePaymentId: paymentIntentId,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              status: 'succeeded',
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const existing = await db.subscription.findUnique({
          where: { stripeCustomerId: invoice.customer as string },
        });

        if (existing) {
          await db.user.update({
            where: { id: existing.userId },
            data: { isPremium: false },
          });
        }
        break;
      }
    }
  },
};

export default stripeService;
