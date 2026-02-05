import Stripe from 'stripe';

export interface StripeConfig {
  apiKey: string;
  webhookSecret: string;
}

export class StripeService {
  public readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor(config: StripeConfig) {
    this.client = new Stripe(config.apiKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
    this.webhookSecret = config.webhookSecret;
  }

  async constructEvent(rawBody: string, signature: string): Promise<Stripe.Event> {
    return this.client.webhooks.constructEventAsync(rawBody, signature, this.webhookSecret);
  }

  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    return this.client.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });
  }

  async createBillingPortalSession(customerId: string, returnUrl: string) {
    return this.client.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }
}

export type { Stripe };
