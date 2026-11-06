import { describe, expect, it } from 'bun:test';
import { appRouter } from '../index';

const HASH = '$argon2id$PASSWORD-HASH-MARKER';
const SECRETS = [HASH, 'REFRESH-TOKEN-MARKER', 'OIDC-ACCESS-MARKER', 'OIDC-ID-MARKER'];
const FORBIDDEN_KEYS = ['"password"', '"tokenHash"', '"accessToken"', '"refreshToken"', '"idToken"'];
const SESSION_KEY = '"token"';

const user = () => ({
  id: 'u1',
  email: 'a@b.fr',
  firstName: 'A',
  lastName: 'B',
  role: 'MEMBER',
  status: 'ACTIVE',
  isBanned: false,
  isSuspended: false,
  suspendedUntil: null,
  emailVerified: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  lastLoginAt: null,
  password: HASH,
  avatar: null,
  coverImage: null,
  sessions: [{ id: 's1', userId: 'u1', token: 'REFRESH-TOKEN-MARKER', createdAt: new Date(0) }],
  accounts: [
    {
      id: 'a1',
      providerId: 'oidc',
      accountId: 'sub-staff',
      accessToken: 'OIDC-ACCESS-MARKER',
      refreshToken: 'REFRESH-TOKEN-MARKER',
      idToken: 'OIDC-ID-MARKER',
      password: HASH,
    },
  ],
  adminPermissions: [],
  auditLogs: [],
  documents: [],
  client: null,
});

const client = () => ({
  id: 'c1',
  spaceId: 'space-a',
  userId: 'u1',
  companyName: 'Acme',
  contactFirstName: 'A',
  contactLastName: 'B',
  contactEmail: 'a@b.fr',
  stripeCustomerId: null,
  user: user(),
  payments: [],
});

const payment = () => ({
  id: 'p1',
  spaceId: 'space-a',
  clientId: 'c1',
  status: 'PENDING',
  amount: 10,
  missionId: null,
  stripePaymentIntentId: null,
  stripeSubscriptionId: null,
  client: client(),
  invoices: [],
  attachedDocuments: [],
});

const member = () => ({ spaceId: 's1', userId: 'u1', role: 'OWNER', joinedAt: new Date(0), user: user() });

const ROWS: Record<string, () => any> = {
  user,
  client,
  payment,
  spaceMember: member,
  space: () => ({ id: 's1', name: 'Team', description: null, registreSpaceId: null, createdAt: new Date(0), updatedAt: new Date(0) }),
  settings: () => ({ id: 'global', webhookUrl: null, webhookEvents: [] }),
  spaceSettings: () => ({ spaceId: 's1', webhookUrl: null, webhookSecret: null, webhookEvents: [] }),
  session: () => ({ id: 's1', userId: 'u1', token: 'old', expiresAt: new Date(Date.now() + 1e6) }),
  auditLog: () => ({ id: 'l1' }),
  media: () => ({ id: 'm1', url: 'u', key: 'k' }),
  paymentDocument: () => ({ id: 'pd1', paymentId: 'p1', document: { id: 'd1', spaceId: 'space-a' } }),
  adminPermission: () => ({ id: 'ap1' }),
};

const isRelation = (value: unknown) =>
  value !== null && typeof value === 'object' && !(value instanceof Date);

function project(value: any, args: any = {}): any {
  if (Array.isArray(value)) return value.map((item) => project(item, args));
  if (!isRelation(value)) return value;

  const { select, include, omit } = args;
  const out: Record<string, any> = {};
  for (const [key, field] of Object.entries(value)) {
    if (select) {
      if (!select[key]) continue;
      out[key] = isRelation(field) && typeof select[key] === 'object' ? project(field, select[key]) : field;
    } else if (isRelation(field)) {
      if (include?.[key]) out[key] = project(field, include[key] === true ? {} : include[key]);
    } else if (!omit?.[key]) {
      out[key] = field;
    }
  }
  return out;
}

function fakeDb(targetMember: unknown): any {
  const db: any = new Proxy(
    {},
    {
      get: (_target, model: string) => {
        if (model === '$transaction') {
          return async (arg: any) => (typeof arg === 'function' ? arg(db) : Promise.all(arg));
        }
        const row = ROWS[model];
        if (!row) return undefined;
        return new Proxy(
          {},
          {
            get: (_t, method: string) => async (args: any = {}) => {
              if (['deleteMany', 'updateMany', 'createMany'].includes(method)) return { count: 1 };
              if (method === 'count') return 1;
              if (method === 'aggregate') return { _sum: { amount: 0 }, _count: 0 };
              if (['findUnique', 'findFirst'].includes(method) && args.where?.email && model === 'user') {
                return String(args.where.email).startsWith('target')
                  ? project({ ...user(), id: 'u2' }, args)
                  : null;
              }
              if (model === 'spaceMember' && args.where?.spaceId_userId?.userId === 'u2') {
                return targetMember === null ? null : project(targetMember, args);
              }
              if (method === 'findMany') return project([row()], args);
              return project(row(), args);
            },
          }
        );
      },
    }
  );
  return db;
}

const stripe = {
  client: { paymentIntents: { cancel: async () => ({}) }, subscriptions: { cancel: async () => ({}) } },
};
const smtp = { sendEmail: async () => undefined };

function caller(
  targetMember: unknown = { ...member(), role: 'MEMBER', userId: 'u2' },
  role: 'MEMBER' | 'CLIENT' = 'MEMBER'
) {
  return appRouter.createCaller({
    db: fakeDb(targetMember),
    auth: {
      hashPassword: async (p: string) => `hash:${p}`,
      verifyPassword: async () => true,
    },
    user: { id: 'u1', role, email: 'a@b.fr' },
    log: { debug() {}, error() {}, info() {}, warn() {} },
    storage: {},
    env: { OIDC_ISSUER: 'oidc', PLATFORM_STAFF_SUBS: 'sub-staff' },
    req: new Request('http://x'),
    resHeaders: new Headers(),
    appOrigin: 'http://app',
    apiOrigin: 'http://api',
    getStripe: async () => stripe,
    getSmtp: async () => smtp,
  } as any);
}

function assertClean(result: unknown) {
  const json = JSON.stringify(result);
  expect(json.length).toBeGreaterThan(2);
  for (const secret of SECRETS) expect(json).not.toContain(secret);
  for (const key of FORBIDDEN_KEYS) expect(json).not.toContain(key);
  expect(json).not.toContain(SESSION_KEY);
}

const surfaces: Record<string, (c: ReturnType<typeof caller>) => Promise<unknown>> = {
  'user.me': (c) => c.user.me(),
  'user.deleteOwnAccount': (c) => c.user.deleteOwnAccount(),
  'client.list': (c) => c.client.list({} as any),
  'client.getById': (c) => c.client.getById({ id: 'c1' }),
  'client.update': (c) => c.client.update({ id: 'c1', companyName: 'New' }),
  'client.create': (c) =>
    c.client.create({ contactFirstName: 'A', contactLastName: 'B', companyName: 'Acme', spaceId: 'space-a' } as any),
  'payment.list': (c) => c.payment.list({} as any),
  'payment.getById': (c) => c.payment.getById({ id: 'p1' }),
  'payment.update': (c) => c.payment.update({ id: 'p1', description: 'd' }),
  'payment.cancel': (c) => c.payment.cancel({ id: 'p1' }),
  'payment.myPayments': (c) => c.payment.myPayments(),
  'admin.list': (c) => c.admin.list({ entity: 'user' }),
  'admin.get': (c) => c.admin.get({ entity: 'user', id: 'u1' }),
  'admin.update': (c) => c.admin.update({ entity: 'user', id: 'u1', data: { firstName: 'Z' } }),
  'admin.getAuditLogs': (c) => c.admin.getAuditLogs({ entity: 'user', entityId: 'u1' }),
  'space.getMembers': (c) => c.space.getMembers({ id: 's1' }),
  'space.addMember': (c) => c.space.addMember({ spaceId: 's1', email: 'target@b.fr', role: 'MEMBER' }),
  'space.updateMemberRole': (c) => c.space.updateMemberRole({ spaceId: 's1', userId: 'u2', role: 'ADMIN' }),
};

describe('procedures never serialize secrets', () => {
  for (const [name, call] of Object.entries(surfaces)) {
    it(name, async () => {
      const role = ['user.deleteOwnAccount', 'payment.myPayments'].includes(name) ? 'CLIENT' : 'MEMBER';
      assertClean(await call(caller(name === 'space.addMember' ? null : undefined, role)));
    });
  }
});

describe('admin.create for users', () => {
  it('is refused, and the refusal never echoes a hash', async () => {
    const error = await caller()
      .admin.create({ entity: 'user', data: { email: 'n@b.fr', firstName: 'N', lastName: 'B', password: HASH } })
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'BAD_REQUEST' });
    assertClean({ message: (error as Error).message });
  });
});
