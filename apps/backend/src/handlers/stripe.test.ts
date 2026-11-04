import { describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { StripeService } from '@repo/stripe';
import { createStripeWebhookHandler, type StripeWebhookDeps } from './stripe';

const SECRET = 'whsec_test_secret';
const service = new StripeService({ apiKey: 'sk_test_x', webhookSecret: SECRET });

function setup(failBilling = false) {
  const routed: string[] = [];
  const deps = {
    db: {},
    getStripe: async () => service,
    getSmtp: async () => ({}),
    handlePayment: async (_db: unknown, _s: unknown, _m: unknown, _e: unknown, event: { id: string }) =>
      void routed.push(`payment:${event.id}`),
    handleBilling: async (_db: unknown, _s: unknown, event: { id: string }) => {
      if (failBilling) throw new Error('No such customer');
      routed.push(`billing:${event.id}`);
    },
  } as unknown as StripeWebhookDeps;
  const app = new Hono();
  app.post('/webhook', createStripeWebhookHandler({} as never, {} as never, deps));
  return { app, routed };
}

function signed(payload: unknown, secret = SECRET) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const signature = `t=${timestamp},v1=${v1}`;
  return new Request('http://api.test/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
    body,
  });
}

const event = (id: string, type: string, object: unknown) => ({ id, object: 'event', type, created: 1, data: { object } });

describe('Stripe webhook routing', () => {
  it('keeps client invoice payment events on paymentService', async () => {
    const { app, routed } = setup();
    await app.request(signed(event('evt_pi', 'payment_intent.succeeded', { id: 'pi_1' })));
    await app.request(
      signed(event('evt_inv', 'invoice.payment_failed', { id: 'in_1', parent: { subscription_details: { subscription: 'sub_x', metadata: {} } } }))
    );
    await app.request(signed(event('evt_sub', 'customer.subscription.updated', { id: 'sub_x', metadata: {} })));
    expect(routed).toEqual(['payment:evt_pi', 'payment:evt_inv', 'payment:evt_sub']);
  });

  it('sends subscriptions tagged with registre_space_id to billing', async () => {
    const { app, routed } = setup();
    const metadata = { registre_space_id: 'spc_a' };
    await app.request(signed(event('evt_1', 'customer.subscription.created', { id: 'sub_1', metadata })));
    await app.request(
      signed(event('evt_2', 'invoice.paid', { id: 'in_1', parent: { subscription_details: { subscription: 'sub_1', metadata } } }))
    );
    expect(routed).toEqual(['billing:evt_1', 'billing:evt_2']);
  });

  it('processes nothing on a forged signature or a missing one', async () => {
    const { app, routed } = setup();
    const forged = await app.request(signed(event('evt_f', 'customer.subscription.created', { id: 'sub_1', metadata: { registre_space_id: 'spc_a' } }), 'whsec_attacker'));
    expect(forged.status).toBe(200);
    expect(await forged.json()).toMatchObject({ permanent: true });
    const unsigned = await app.request(new Request('http://api.test/webhook', { method: 'POST', body: '{}' }));
    expect(unsigned.status).toBe(400);
    expect(routed).toEqual([]);
  });

  it('answers 500 on any billing failure so Stripe retries', async () => {
    const { app } = setup(true);
    const res = await app.request(
      signed(event('evt_x', 'customer.subscription.updated', { id: 'sub_1', metadata: { registre_space_id: 'spc_a' } }))
    );
    expect(res.status).toBe(500);
  });
});
