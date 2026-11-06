import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { billingRouter } from './modules/billing/router';
import { settingsRouter } from './modules/settings/router';
import { isPlatformStaff, parseStaffEmails } from './platform-staff';
import type { DirectoryView } from './modules/billing/state';

const ISSUER = 'https://sso.example.test';
const env = { OIDC_ISSUER: ISSUER, PLATFORM_STAFF_SUBS: ' sub_yann ,sub_noah,,', PLATFORM_STAFF_EMAILS: '' };

const admin = (sub: string | null, extra: Record<string, unknown> = {}) => ({
  email: 'whatever@client.fr',
  role: 'MEMBER',
  status: 'ACTIVE',
  isBanned: false,
  accounts: sub ? [{ accountId: sub }] : [],
  ...extra,
});

function dbFor(user: Record<string, unknown> | null) {
  return {
    user: {
      findUnique: async (args: any) => {
        expect(args.select.accounts.where.providerId).toBe(ISSUER);
        return user;
      },
    },
    feature: { findMany: async () => [{ key: 'glouton.access', defaultValue: false }] },
  } as unknown as PrismaClient;
}

function callerFor(user: Record<string, unknown> | null, staffEnv: Record<string, string> = env) {
  return billingRouter.createCaller({
    db: dbFor(user),
    user: { id: 'u1', role: 'MEMBER', email: 'x@y.z' },
    env: staffEnv,
    log: { debug() {}, error() {}, info() {}, warn() {} },
  } as never);
}

const snapshot = (verified: boolean): DirectoryView => ({
  version: 1,
  spaces: [{ id: 's', members: [{ sub: 'sub_camille', email: 'Camille@facile.studio', role: 'owner', email_verified: verified }] }],
});

describe('platform staff gate', () => {
  it('parses staff emails trimmed and case-insensitive, empty meaning nobody', () => {
    expect([...parseStaffEmails(' Yann@Facile.studio , noah@facile.studio,,')]).toEqual([
      'yann@facile.studio',
      'noah@facile.studio',
    ]);
    expect(parseStaffEmails('').size).toBe(0);
  });

  it('refuses a normal member with FORBIDDEN', async () => {
    await expect(callerFor(admin('sub_someone')).features()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses a member without a Facile SSO identity, whatever their email', async () => {
    await expect(callerFor(admin(null, { email: 'yann@facile.studio' })).features()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('refuses everybody when no staff list or no issuer is configured', async () => {
    await expect(callerFor(admin('sub_yann'), { OIDC_ISSUER: ISSUER }).features()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      callerFor(admin('sub_yann'), { PLATFORM_STAFF_SUBS: 'sub_yann' } as never).features()
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses a listed subject that is banned, inactive or a client', async () => {
    for (const extra of [{ isBanned: true }, { status: 'SUSPENDED' }, { role: 'CLIENT' }]) {
      await expect(callerFor(admin('sub_yann', extra)).features()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
  });

  it('refuses mutations to a normal member before touching data', async () => {
    await expect(
      callerFor(admin('sub_someone')).saveComp({ email: 'me@client.fr', registreSub: 'sub_someone', reason: 'x', planKey: 'studio' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('lets a listed Registre subject in', async () => {
    expect(await callerFor(admin('sub_noah')).access()).toEqual({ staff: true });
    expect(await callerFor(admin('sub_someone')).access()).toEqual({ staff: false });
    expect((await callerFor(admin('sub_yann')).features()).length).toBe(1);
  });

  it('accepts the email fallback only for an email the snapshot marks verified', async () => {
    const emailEnv = { OIDC_ISSUER: ISSUER, PLATFORM_STAFF_EMAILS: 'camille@facile.studio' };
    const user = admin('sub_camille', { email: 'nobody@else.fr' });
    expect(await isPlatformStaff(dbFor(user), 'u1', emailEnv, () => Promise.resolve(snapshot(true)))).toBe(true);
    expect(await isPlatformStaff(dbFor(user), 'u1', emailEnv, () => Promise.resolve(snapshot(false)))).toBe(false);
    expect(await isPlatformStaff(dbFor(user), 'u1', emailEnv, () => null)).toBe(false);
    const other = admin('sub_attacker', { email: 'camille@facile.studio' });
    expect(await isPlatformStaff(dbFor(other), 'u1', emailEnv, () => Promise.resolve(snapshot(true)))).toBe(false);
  });

  it('still honours the deprecated BILLING_STAFF_* aliases', async () => {
    const legacy = { OIDC_ISSUER: ISSUER, BILLING_STAFF_SUBS: 'sub_yann' };
    expect(await isPlatformStaff(dbFor(admin('sub_yann')), 'u1', legacy)).toBe(true);
    expect(await isPlatformStaff(dbFor(admin('sub_noah')), 'u1', legacy)).toBe(false);
    const merged = { ...legacy, PLATFORM_STAFF_SUBS: 'sub_noah' };
    expect(await isPlatformStaff(dbFor(admin('sub_noah')), 'u1', merged)).toBe(true);
  });

  it('lets a legacy ADMIN row in only through its listed subject', async () => {
    expect(await isPlatformStaff(dbFor(admin('sub_someone', { role: 'ADMIN' })), 'u1', env)).toBe(false);
    expect(await isPlatformStaff(dbFor(admin('sub_yann', { role: 'ADMIN' })), 'u1', env)).toBe(true);
  });

  it('refuses settings.update to a non-staff member before reading anything', async () => {
    const caller = settingsRouter.createCaller({
      db: dbFor(admin('sub_someone')),
      user: { id: 'u1', role: 'MEMBER', email: 'x@y.z' },
      env,
      log: { debug() {}, error() {}, info() {}, warn() {} },
    } as never);
    await expect(caller.update({ stripeSecretKey: 'sk_live_attacker' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller.getAdmin()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
