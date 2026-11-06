import { describe, expect, it } from 'bun:test';
import { effectivePlan, resolveEntitlements, type ResolveInput, type PlanValues } from './resolve';
import { moreGenerous } from './values';

const now = new Date('2026-11-04T12:00:00Z');
const day = 24 * 60 * 60 * 1000;

const features = [
  { key: 'nuage.storage_gb', kind: 'limit' as const, defaultValue: 5 },
  { key: 'courrier.mailboxes', kind: 'limit' as const, defaultValue: 1 },
  { key: 'glouton.access', kind: 'bool' as const, defaultValue: false },
];

const pro: PlanValues = {
  key: 'pro',
  values: { 'nuage.storage_gb': 100, 'courrier.mailboxes': 5, 'glouton.access': true },
};
const studio: PlanValues = {
  key: 'studio',
  values: { 'nuage.storage_gb': 500, 'courrier.mailboxes': -1, 'glouton.access': true },
};
const solo = { 'nuage.storage_gb': 5, 'courrier.mailboxes': 1, 'glouton.access': false };

function input(overrides: Partial<ResolveInput> = {}): ResolveInput {
  return {
    now,
    features,
    free: { key: 'solo', values: {} },
    comps: [],
    spaces: [],
    people: [],
    overrides: [],
    ...overrides,
  };
}

const active = (plan: PlanValues, status = 'active') => ({
  status,
  currentPeriodEnd: new Date(now.getTime() + 10 * day),
  pastDueSince: null,
  plan,
});

describe('moreGenerous', () => {
  it('lets -1 beat any number', () => {
    expect(moreGenerous('limit', -1, 1_000_000)).toBe(-1);
    expect(moreGenerous('limit', 3, -1)).toBe(-1);
  });

  it('keeps the larger number and the true bool', () => {
    expect(moreGenerous('limit', 3, 7)).toBe(7);
    expect(moreGenerous('bool', false, true)).toBe(true);
    expect(moreGenerous('bool', false, false)).toBe(false);
  });
});

describe('effectivePlan', () => {
  it('grants the plan to active and trialing subscriptions', () => {
    expect(effectivePlan(active(pro), now)).toBe(pro);
    expect(effectivePlan(active(pro, 'trialing'), now)).toBe(pro);
  });

  it('keeps past_due on the plan for seven days after the first failure', () => {
    const sub = { ...active(pro, 'past_due'), pastDueSince: new Date(now.getTime() - 6 * day) };
    expect(effectivePlan(sub, now)).toBe(pro);
    expect(effectivePlan({ ...sub, pastDueSince: new Date(now.getTime() - 8 * day) }, now)).toBeNull();
  });

  it('falls back to the period end as grace anchor', () => {
    const sub = {
      ...active(pro, 'past_due'),
      currentPeriodEnd: new Date(now.getTime() - 8 * day),
    };
    expect(effectivePlan(sub, now)).toBeNull();
  });

  it('drops canceled, unpaid, incomplete_expired and planless subscriptions', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete_expired', 'incomplete', 'none']) {
      expect(effectivePlan(active(pro, status), now)).toBeNull();
    }
    expect(effectivePlan({ ...active(pro), plan: null }, now)).toBeNull();
    expect(effectivePlan(null, now)).toBeNull();
  });
});

describe('resolveEntitlements spaces', () => {
  it('gives a space without subscription the defaults and the free plan key', () => {
    const out = resolveEntitlements(input({ spaces: [{ id: 's1', comp: null, ownerSubs: [], subscription: null }] }));
    expect(out.spaces[0]).toEqual({ id: 's1', plan: 'solo', status: 'none', comped: false, entitlements: solo });
  });

  it('gives an active subscription its plan values', () => {
    const out = resolveEntitlements(
      input({ spaces: [{ id: 's1', comp: null, ownerSubs: [], subscription: active(pro) }] })
    );
    expect(out.spaces[0]!.plan).toBe('pro');
    expect(out.spaces[0]!.entitlements).toEqual(pro.values as any);
  });

  it('falls back to the default for a feature the plan version lacks or stores malformed', () => {
    const partial: PlanValues = { key: 'pro', values: { 'nuage.storage_gb': 'lots', 'glouton.access': true } };
    const out = resolveEntitlements(
      input({ spaces: [{ id: 's1', comp: null, ownerSubs: [], subscription: active(partial) }] })
    );
    expect(out.spaces[0]!.entitlements).toEqual({
      'nuage.storage_gb': 5,
      'courrier.mailboxes': 1,
      'glouton.access': true,
    });
  });

  it('never comps a space because an owner is comped', async () => {
    const out = resolveEntitlements(
      input({
        comps: [{ sub: 'noah', plan: studio }],
        spaces: [{ id: 's1', comp: null, ownerSubs: ['attacker', 'noah'], subscription: null }],
        people: [{ sub: 'attacker', email: 'a@x.fr' }, { sub: 'noah', email: 'noah@facile.studio' }],
      })
    );
    expect(out.spaces[0]).toMatchObject({ plan: 'solo', comped: false, entitlements: solo });
    expect(out.people[0]!.entitlements).toEqual(solo);
    expect(out.people[1]!.entitlements).toEqual(studio.values as any);
  });

  it('puts an explicitly comped space on the comp plan over its subscription', () => {
    const out = resolveEntitlements(
      input({ spaces: [{ id: 's1', comp: studio, ownerSubs: ['owner'], subscription: active(pro) }] })
    );
    expect(out.spaces[0]!.comped).toBe(true);
    expect(out.spaces[0]!.plan).toBe('studio');
    expect(out.spaces[0]!.entitlements['courrier.mailboxes']).toBe(-1);
  });

  it('lets an override beat the space comp, even when less generous', () => {
    const out = resolveEntitlements(
      input({
        spaces: [{ id: 's1', comp: studio, ownerSubs: ['owner'], subscription: null }],
        overrides: [
          { scope: 'space', registreSpaceId: 's1', personSub: null, feature: 'nuage.storage_gb', value: 42, expiresAt: null },
        ],
      })
    );
    expect(out.spaces[0]!.entitlements['nuage.storage_gb']).toBe(42);
  });

  it('ignores expired overrides, malformed values, unknown features and other spaces', () => {
    const out = resolveEntitlements(
      input({
        spaces: [{ id: 's1', comp: null, ownerSubs: [], subscription: null }],
        overrides: [
          { scope: 'space', registreSpaceId: 's1', personSub: null, feature: 'nuage.storage_gb', value: 99, expiresAt: new Date(now.getTime() - 1) },
          { scope: 'space', registreSpaceId: 's1', personSub: null, feature: 'glouton.access', value: 1, expiresAt: null },
          { scope: 'space', registreSpaceId: 's1', personSub: null, feature: 'nope.nope', value: true, expiresAt: null },
          { scope: 'space', registreSpaceId: 's2', personSub: null, feature: 'courrier.mailboxes', value: 9, expiresAt: null },
          { scope: 'space', registreSpaceId: 's1', personSub: null, feature: 'courrier.mailboxes', value: -2, expiresAt: null },
        ],
      })
    );
    expect(out.spaces[0]!.entitlements).toEqual(solo);
  });

  it('applies the latest of two overrides on one feature', () => {
    const out = resolveEntitlements(
      input({
        spaces: [{ id: 's1', comp: null, ownerSubs: [], subscription: null }],
        overrides: [
          { scope: 'space', registreSpaceId: 's1', personSub: null, feature: 'nuage.storage_gb', value: 10, expiresAt: null },
          { scope: 'space', registreSpaceId: 's1', personSub: null, feature: 'nuage.storage_gb', value: 20, expiresAt: new Date(now.getTime() + day) },
        ],
      })
    );
    expect(out.spaces[0]!.entitlements['nuage.storage_gb']).toBe(20);
  });

  it('drops a past_due space to free after the grace period', () => {
    const sub = { ...active(pro, 'past_due'), pastDueSince: new Date(now.getTime() - 8 * day) };
    const out = resolveEntitlements(input({ spaces: [{ id: 's1', comp: null, ownerSubs: [], subscription: sub }] }));
    expect(out.spaces[0]).toMatchObject({ plan: 'solo', status: 'past_due', entitlements: solo });
  });

  it('skips comps whose plan does not exist', () => {
    const out = resolveEntitlements(
      input({ comps: [{ sub: 'owner', plan: null }], people: [{ sub: 'owner', email: 'o@x.fr' }] })
    );
    expect(out.people[0]!.entitlements).toEqual(solo);
  });

  it('a malformed feature default falls back to false or 0', () => {
    const out = resolveEntitlements(
      input({
        features: [
          { key: 'a.b', kind: 'bool', defaultValue: 'yes' },
          { key: 'a.c', kind: 'limit', defaultValue: 2.5 },
        ],
        spaces: [{ id: 's1', comp: null, ownerSubs: [], subscription: null }],
      })
    );
    expect(out.spaces[0]!.entitlements).toEqual({ 'a.b': false, 'a.c': 0 });
  });
});

describe('resolveEntitlements people', () => {
  it('gives a person the most generous value across the spaces they own', () => {
    const mixed: PlanValues = {
      key: 'mixed',
      values: { 'nuage.storage_gb': -1, 'courrier.mailboxes': 2, 'glouton.access': false },
    };
    const out = resolveEntitlements(
      input({
        spaces: [
          { id: 's1', comp: null, ownerSubs: ['p'], subscription: active(pro) },
          { id: 's2', comp: null, ownerSubs: ['p'], subscription: active(mixed) },
          { id: 's3', comp: null, ownerSubs: ['other'], subscription: active(studio) },
        ],
        people: [{ sub: 'p', email: 'p@x.fr' }],
      })
    );
    expect(out.people[0]!.entitlements).toEqual({
      'nuage.storage_gb': -1,
      'courrier.mailboxes': 5,
      'glouton.access': true,
    });
  });

  it('inherits only the paid plan of owned spaces, never their comp or overrides', () => {
    const out = resolveEntitlements(
      input({
        spaces: [{ id: 's1', comp: studio, ownerSubs: ['p'], subscription: null }],
        people: [{ sub: 'p', email: 'p@x.fr' }],
        overrides: [
          { scope: 'space', registreSpaceId: 's1', personSub: null, feature: 'glouton.access', value: true, expiresAt: null },
        ],
      })
    );
    expect(out.people[0]!.entitlements).toEqual(solo);
  });

  it('gives a person who owns nothing the defaults', () => {
    const out = resolveEntitlements(
      input({
        spaces: [{ id: 's1', comp: null, ownerSubs: ['owner'], subscription: active(studio) }],
        people: [{ sub: 'member', email: 'm@x.fr' }],
      })
    );
    expect(out.people[0]!.entitlements).toEqual(solo);
  });

  it('gives a comped person the comp plan even with no space', () => {
    const out = resolveEntitlements(
      input({ comps: [{ sub: 'yann', plan: studio }], people: [{ sub: 'yann', email: 'yann@facile.studio' }] })
    );
    expect(out.people[0]!.entitlements).toEqual(studio.values as any);
  });

  it('applies person overrides by Registre subject after the merge', () => {
    const out = resolveEntitlements(
      input({
        spaces: [{ id: 's1', comp: null, ownerSubs: ['p'], subscription: active(studio) }],
        people: [{ sub: 'p', email: 'P@X.fr' }],
        overrides: [
          { scope: 'person', registreSpaceId: null, personSub: 'p', feature: 'nuage.storage_gb', value: 1, expiresAt: null },
          { scope: 'person', registreSpaceId: null, personSub: 'other', feature: 'glouton.access', value: false, expiresAt: null },
        ],
      })
    );
    expect(out.people[0]!.entitlements['nuage.storage_gb']).toBe(1);
    expect(out.people[0]!.entitlements['glouton.access']).toBe(true);
  });
});
