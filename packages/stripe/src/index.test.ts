import { describe, expect, it } from 'bun:test';
import { StripeService } from './index';

describe('StripeService.createCheckoutSession', () => {
  it('leaves the payment methods to the account configuration', async () => {
    const service = new StripeService({ apiKey: 'sk_test_x', webhookSecret: 'whsec_x' });
    const seen: Record<string, unknown>[] = [];
    (service.client.checkout.sessions as unknown as { create: unknown }).create = async (params: Record<string, unknown>) => {
      seen.push(params);
      return { id: 'cs_1' };
    };
    await service.createCheckoutSession({ customerId: 'cus_1', priceId: 'price_1', successUrl: 'https://a.test/ok', cancelUrl: 'https://a.test/no' });
    expect(seen[0]).toMatchObject({ mode: 'subscription', customer: 'cus_1' });
    expect(seen[0]).not.toHaveProperty('payment_method_types');
  });
});
