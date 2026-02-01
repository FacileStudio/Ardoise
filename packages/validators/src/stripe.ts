import { z } from 'zod';

export const stripePriceIdValidator = z
  .string()
  .min(1, 'Stripe Price ID is required')
  .startsWith('price_', 'Invalid Stripe Price ID format');

export const stripeCustomerIdValidator = z
  .string()
  .min(1, 'Stripe Customer ID is required')
  .startsWith('cus_', 'Invalid Stripe Customer ID format');

export const stripeSubscriptionIdValidator = z
  .string()
  .min(1, 'Stripe Subscription ID is required')
  .startsWith('sub_', 'Invalid Stripe Subscription ID format');

export const createCheckoutSessionSchema = z.object({
  priceId: stripePriceIdValidator,
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
