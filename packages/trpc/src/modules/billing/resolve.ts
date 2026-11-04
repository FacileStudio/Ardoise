import {
  PAST_DUE_GRACE_DAYS,
  isValueOfKind,
  moreGenerous,
  type EntitlementValue,
  type Entitlements,
  type FeatureKind,
} from './values';

/** One feature as resolution sees it. */
export interface FeatureDef {
  key: string;
  kind: FeatureKind;
  defaultValue: unknown;
}

/** One plan version's values, keyed by feature key. Missing keys fall back to the feature default. */
export interface PlanValues {
  key: string;
  values: Record<string, unknown>;
}

/** A space's Stripe subscription as Ardoise mirrors it. */
export interface SubscriptionState {
  status: string;
  currentPeriodEnd: Date | null;
  pastDueSince: Date | null;
  plan: PlanValues | null;
}

/** An admin override; later entries in the input win over earlier ones on the same scope and feature. */
export interface OverrideDef {
  scope: 'space' | 'person';
  registreSpaceId: string | null;
  personEmail: string | null;
  feature: string;
  value: unknown;
  expiresAt: Date | null;
}

/** A comped person, already resolved to a Registre subject from a verified snapshot email. */
export interface CompDef {
  sub: string;
  plan: PlanValues | null;
}

/** One Registre space with its owners' subjects. */
export interface SpaceInput {
  id: string;
  ownerSubs: string[];
  subscription: SubscriptionState | null;
}

/** One Registre person. */
export interface PersonInput {
  sub: string;
  email: string;
}

/** Everything resolution needs, gathered by the caller. */
export interface ResolveInput {
  now: Date;
  features: FeatureDef[];
  freePlanKey: string;
  comps: CompDef[];
  spaces: SpaceInput[];
  people: PersonInput[];
  overrides: OverrideDef[];
}

/** The resolved state of one space. */
export interface ResolvedSpace {
  id: string;
  plan: string;
  status: string;
  comped: boolean;
  entitlements: Entitlements;
}

/** The resolved personal scope of one person. */
export interface ResolvedPerson {
  sub: string;
  email: string;
  entitlements: Entitlements;
}

/** The output of resolveEntitlements. */
export interface Resolution {
  spaces: ResolvedSpace[];
  people: ResolvedPerson[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

/** A feature's default, coerced to a safe value of its kind when the stored one is malformed. */
function defaultOf(feature: FeatureDef): EntitlementValue {
  if (isValueOfKind(feature.kind, feature.defaultValue)) return feature.defaultValue;
  return feature.kind === 'bool' ? false : 0;
}

/** A plan's value for one feature, or the feature default when missing or malformed. */
function planValue(feature: FeatureDef, plan: PlanValues): EntitlementValue {
  const value = plan.values[feature.key];
  return isValueOfKind(feature.kind, value) ? value : defaultOf(feature);
}

/** The plan a subscription grants right now, honouring the past_due grace period. */
export function effectivePlan(subscription: SubscriptionState | null, now: Date): PlanValues | null {
  if (!subscription?.plan) return null;
  if (ACTIVE_STATUSES.has(subscription.status)) return subscription.plan;
  if (subscription.status !== 'past_due') return null;
  const anchor = subscription.pastDueSince ?? subscription.currentPeriodEnd;
  if (!anchor) return null;
  return now.getTime() <= anchor.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS ? subscription.plan : null;
}

/** Merges plan values feature by feature, keeping the most generous. */
function mergePlans(features: FeatureDef[], plans: PlanValues[]): Entitlements {
  const out: Entitlements = {};
  for (const feature of features) {
    const values = plans.map((plan) => planValue(feature, plan));
    out[feature.key] = values.reduce((a, b) => moreGenerous(feature.kind, a, b));
  }
  return out;
}

/** Applies the active overrides of one scope on top of resolved values. */
function applyOverrides(
  features: FeatureDef[],
  base: Entitlements,
  overrides: OverrideDef[]
): Entitlements {
  const kinds = new Map(features.map((feature) => [feature.key, feature.kind]));
  const out = { ...base };
  for (const override of overrides) {
    const kind = kinds.get(override.feature);
    if (kind && isValueOfKind(kind, override.value)) out[override.feature] = override.value;
  }
  return out;
}

/**
 * Resolves every space and person scope, following the suite contract:
 * override > owner comp > active subscription's plan version > feature
 * defaults. past_due keeps the plan for seven days after the first failure
 * (or the period end), then falls to free. A person gets, per feature, the
 * most generous value across every space they own and their own comp, then
 * their own overrides. Expired overrides are ignored.
 */
export function resolveEntitlements(input: ResolveInput): Resolution {
  const { features, now } = input;
  const free: PlanValues = { key: input.freePlanKey, values: {} };
  const active = input.overrides.filter((o) => !o.expiresAt || o.expiresAt.getTime() > now.getTime());
  const compsBySub = new Map<string, PlanValues[]>();
  for (const comp of input.comps) {
    if (!comp.plan) continue;
    compsBySub.set(comp.sub, [...(compsBySub.get(comp.sub) ?? []), comp.plan]);
  }

  const spaces = input.spaces.map((space): ResolvedSpace => {
    const compPlans = space.ownerSubs.flatMap((sub) => compsBySub.get(sub) ?? []);
    const paid = effectivePlan(space.subscription, now);
    const source = compPlans.length > 0 ? compPlans : [paid ?? free];
    const overrides = active.filter((o) => o.scope === 'space' && o.registreSpaceId === space.id);
    return {
      id: space.id,
      plan: source[0]!.key,
      status: space.subscription?.status ?? 'none',
      comped: compPlans.length > 0,
      entitlements: applyOverrides(features, mergePlans(features, source), overrides),
    };
  });

  const ownedBy = new Map<string, Entitlements[]>();
  input.spaces.forEach((space, index) => {
    for (const sub of new Set(space.ownerSubs)) {
      ownedBy.set(sub, [...(ownedBy.get(sub) ?? []), spaces[index]!.entitlements]);
    }
  });

  const people = input.people.map((person): ResolvedPerson => {
    const email = person.email.toLowerCase();
    const base = mergePlans(features, compsBySub.get(person.sub) ?? [free]);
    for (const owned of ownedBy.get(person.sub) ?? []) {
      for (const feature of features) {
        base[feature.key] = moreGenerous(feature.kind, base[feature.key]!, owned[feature.key]!);
      }
    }
    const overrides = active.filter(
      (o) => o.scope === 'person' && o.personEmail?.toLowerCase() === email
    );
    return { sub: person.sub, email: person.email, entitlements: applyOverrides(features, base, overrides) };
  });

  return { spaces, people };
}
