import { z } from 'zod';

/** An entitlement value: a bool, or an integer limit where -1 means unlimited. */
export type EntitlementValue = boolean | number;

/** The two shapes a feature value takes. */
export type FeatureKind = 'bool' | 'limit';

/** Entitlements of one scope, keyed by feature key. */
export type Entitlements = Record<string, EntitlementValue>;

/** The largest limit a feature may carry, so every value fits Go's int64 and JSON numbers exactly. */
export const MAX_LIMIT = 1_000_000_000;

/** The most features one plan version, override set or scope may carry. */
export const MAX_FEATURES = 200;

/** The largest price, in cents, one plan may charge. */
export const MAX_AMOUNT_CENTS = 10_000_000;

/** Days a past_due subscription keeps its plan after the anchor date. */
export const PAST_DUE_GRACE_DAYS = 7;

/** Feature keys look like `app.feature`, lowercase with underscores. */
export const featureKeySchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9_]+\.[a-z0-9_]+$/, 'Clé invalide: app.fonctionnalite en minuscules');

/** Plan keys are lowercase words, so `plan_<key>_<interval>` stays a valid lookup key. */
export const planKeySchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9_]+$/, 'Clé invalide: minuscules, chiffres et _');

/** A limit value: an integer from -1 (unlimited) to MAX_LIMIT. */
export const limitValueSchema = z.number().int().min(-1).max(MAX_LIMIT);

/** Any entitlement value as it crosses a trust boundary. */
export const entitlementValueSchema = z.union([z.boolean(), limitValueSchema]);

/** Whether a stored JSON value is a valid value for a feature of this kind. */
export function isValueOfKind(kind: FeatureKind, value: unknown): value is EntitlementValue {
  if (kind === 'bool') return typeof value === 'boolean';
  return limitValueSchema.safeParse(value).success;
}

/**
 * The more generous of two values of one feature: true beats false, -1
 * beats any number, otherwise the larger number wins.
 */
export function moreGenerous(kind: FeatureKind, a: EntitlementValue, b: EntitlementValue): EntitlementValue {
  if (kind === 'bool') return a === true || b === true;
  const x = Number(a);
  const y = Number(b);
  if (x === -1 || y === -1) return -1;
  return Math.max(x, y);
}

/** The Stripe lookup key of one plan price, `plan_<plan>_<interval>`. */
export function lookupKeyFor(planKey: string, interval: 'month' | 'year'): string {
  return `plan_${planKey}_${interval}`;
}

/** The Stripe product id of one plan, `plan_<plan>`. */
export function productIdFor(planKey: string): string {
  return `plan_${planKey}`;
}
