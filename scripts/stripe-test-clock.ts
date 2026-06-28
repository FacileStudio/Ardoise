/**
 * Stripe test-clock dry run for recurring payments.
 *
 * Simulates a full monthly subscription cycle in TEST MODE using a Stripe
 * test clock, so you can verify the recurring flow (and your webhook handlers)
 * without waiting a real month or touching live data.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx bun run scripts/stripe-test-clock.ts
 *   STRIPE_SECRET_KEY=sk_test_xxx bun run scripts/stripe-test-clock.ts --fail
 *
 * --fail uses a card that fails on charge, so the renewal triggers
 * `invoice.payment_failed` (which our webhook maps to PAST_DUE).
 *
 * If your backend webhook endpoint is reachable and its signing secret is
 * configured, advancing the clock will deliver real events to it. Otherwise,
 * this still validates the Stripe-side behaviour and prints the resulting state.
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
const shouldFail = process.argv.includes('--fail');

if (!key) {
  console.error('Set STRIPE_SECRET_KEY (a test-mode key, sk_test_...).');
  process.exit(1);
}

if (!key.startsWith('sk_test_')) {
  console.error('Refusing to run: STRIPE_SECRET_KEY must be a TEST key (sk_test_...).');
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2026-01-28.clover', typescript: true });

const MONTH_SECONDS = 32 * 24 * 60 * 60;
const now = Math.floor(Date.now() / 1000);
const paymentMethodId = shouldFail ? 'pm_card_chargeCustomerFail' : 'pm_card_visa';

async function main() {
  console.log(`\n=== Stripe test-clock dry run (${shouldFail ? 'FAILURE' : 'success'} path) ===\n`);

  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: now });
  console.log(`1. Test clock created: ${clock.id}`);

  const customer = await stripe.customers.create({
    name: 'Test Maintenance Client',
    email: 'test-maintenance@example.com',
    test_clock: clock.id,
  });
  console.log(`2. Customer created on clock: ${customer.id}`);

  await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  console.log(`3. Payment method attached: ${paymentMethodId}`);

  const price = await stripe.prices.create({
    currency: 'eur',
    unit_amount: 9900,
    recurring: { interval: 'month' },
    product_data: { name: 'Maintenance mensuelle (test)' },
  });
  console.log(`4. Monthly price created: ${price.id} (99.00 EUR/month)`);

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
    expand: ['latest_invoice'],
  });
  const firstInvoice = subscription.latest_invoice as Stripe.Invoice | null;
  console.log(
    `5. Subscription created: ${subscription.id} (status: ${subscription.status}); ` +
      `first invoice ${firstInvoice?.id} → ${firstInvoice?.status}`
  );

  console.log('\n6. Advancing clock ~1 month to trigger the renewal invoice...');
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: now + MONTH_SECONDS });

  let clockState = await stripe.testHelpers.testClocks.retrieve(clock.id);
  let guard = 0;
  while (clockState.status === 'advancing' && guard < 30) {
    await new Promise((r) => setTimeout(r, 2000));
    clockState = await stripe.testHelpers.testClocks.retrieve(clock.id);
    guard += 1;
  }
  console.log(`   Clock status: ${clockState.status}`);

  const refreshed = await stripe.subscriptions.retrieve(subscription.id);
  const invoices = await stripe.invoices.list({ subscription: subscription.id, limit: 10 });
  console.log(`\n=== Result ===`);
  console.log(`Subscription ${refreshed.id} status: ${refreshed.status}`);
  console.log(`Invoices (${invoices.data.length}):`);
  for (const inv of invoices.data) {
    console.log(
      `  - ${inv.id}: ${inv.status} | paid=${inv.paid} | ` +
        `amount_paid=${(inv.amount_paid ?? 0) / 100} EUR`
    );
  }

  console.log(
    `\nExpected webhook(s): ${
      shouldFail
        ? 'invoice.payment_failed → Payment.status PAST_DUE'
        : 'invoice.payment_succeeded (x2) → Payment.status PAID + a PaymentInvoice row per cycle'
    }`
  );
  console.log(`\nClean up test objects in the Stripe dashboard (test mode) when done.\n`);
}

main().catch((err) => {
  console.error('\nDry run failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
