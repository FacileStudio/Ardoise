import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@repo/trpc';

type BillingOutput = inferRouterOutputs<AppRouter>['billing'];

export type BillingFeature = BillingOutput['features'][number];
export type BillingPlan = BillingOutput['plans'][number];
export type BillingVersion = BillingOutput['version'];
export type BillingOverride = BillingOutput['overrides'][number];
export type BillingComp = BillingOutput['comps'][number];
export type BillingSubscription = BillingOutput['subscriptions'][number];
export type PublishPreview = BillingOutput['previewPublish'];

export type Tone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** Formats an amount in cents as euros, or a dash when absent. */
export function formatCents(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '-' : euros.format(cents / 100);
}

/** Formats an entitlement value for display: Oui/Non, Illimité, or the number with its unit. */
export function formatValue(value: unknown, unit?: string | null): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (value === -1) return 'Illimité';
  return unit ? `${value} ${unit}` : String(value);
}

/** Formats a date in French, or a dash. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const VERSION_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Brouillon', tone: 'warning' },
  published: { label: 'Publiée', tone: 'success' },
  archived: { label: 'Archivée', tone: 'neutral' },
};

/** The French label and badge tone of a plan version status. */
export function versionStatus(status: string): { label: string; tone: Tone } {
  return VERSION_STATUS[status] ?? { label: status, tone: 'neutral' };
}

const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Actif', tone: 'success' },
  trialing: { label: 'Essai', tone: 'info' },
  past_due: { label: 'Impayé', tone: 'warning' },
  unpaid: { label: 'Suspendu', tone: 'danger' },
  canceled: { label: 'Résilié', tone: 'neutral' },
  incomplete: { label: 'Incomplet', tone: 'warning' },
  incomplete_expired: { label: 'Expiré', tone: 'neutral' },
  paused: { label: 'En pause', tone: 'neutral' },
  none: { label: 'Sans abonnement', tone: 'neutral' },
};

/** The French label and badge tone of a Stripe subscription status. */
export function subscriptionStatus(status: string): { label: string; tone: Tone } {
  return SUBSCRIPTION_STATUS[status] ?? { label: status, tone: 'neutral' };
}

/** Parses a limit typed in a form: "illimité" or -1 is unlimited, otherwise an integer >= 0, else null. */
export function parseLimit(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  if (text === '') return null;
  if (text === 'illimité' || text === 'illimite') return -1;
  const value = Number(text);
  return Number.isInteger(value) && value >= -1 ? value : null;
}

/** Parses a price typed in euros into cents; empty means no price. */
export function parseEuros(raw: string): number | null | undefined {
  const text = raw.trim().replace(',', '.');
  if (text === '') return null;
  const value = Math.round(Number(text) * 100);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** A readable message from a tRPC error. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** A stored value as a ValueInput holds it: a bool, or the limit as text. */
export function toFormValue(kind: 'bool' | 'limit', value: unknown): string | boolean {
  if (kind === 'bool') return value === true;
  return typeof value === 'number' ? String(value) : '';
}

/** A ValueInput value back to an entitlement value, or null when the limit is not a valid integer. */
export function fromFormValue(kind: 'bool' | 'limit', value: string | boolean): boolean | number | null {
  if (kind === 'bool') return value === true;
  return parseLimit(String(value));
}
