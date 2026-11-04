import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { billingRouter } from './router';
import { parseStaffEmails } from './staff';

const STAFF = ' Yann@Facile.studio , noah@facile.studio,,';

function callerFor(user: Record<string, unknown> | null, staffEmails = STAFF) {
  const db = {
    user: { findUnique: async () => user },
    feature: { findMany: async () => [{ key: 'glouton.access' }] },
  } as unknown as PrismaClient;
  return billingRouter.createCaller({
    db,
    user: { id: 'u1', role: 'ADMIN', email: String(user?.email ?? 'x@y.z') },
    env: { BILLING_STAFF_EMAILS: staffEmails },
    log: { debug() {}, error() {}, info() {}, warn() {} },
  } as never);
}

const admin = (email: string, extra: Record<string, unknown> = {}) => ({
  email,
  role: 'ADMIN',
  emailVerified: true,
  status: 'ACTIVE',
  isBanned: false,
  ...extra,
});

describe('billing staff gate', () => {
  it('parses BILLING_STAFF_EMAILS trimmed and case-insensitive, empty meaning nobody', () => {
    expect([...parseStaffEmails(STAFF)]).toEqual(['yann@facile.studio', 'noah@facile.studio']);
    expect(parseStaffEmails('').size).toBe(0);
    expect(parseStaffEmails(undefined).size).toBe(0);
  });

  it('refuses a normal ADMIN with FORBIDDEN', async () => {
    await expect(callerFor(admin('someone@client.fr')).features()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses everybody when BILLING_STAFF_EMAILS is empty', async () => {
    await expect(callerFor(admin('yann@facile.studio'), '').features()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses a listed email that is unverified, banned, inactive or not ADMIN', async () => {
    for (const extra of [{ emailVerified: false }, { isBanned: true }, { status: 'SUSPENDED' }, { role: 'CLIENT' }]) {
      await expect(callerFor(admin('yann@facile.studio', extra)).features()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
  });

  it('refuses mutations to a normal ADMIN before touching data', async () => {
    await expect(
      callerFor(admin('someone@client.fr')).saveComp({ email: 'me@client.fr', reason: 'x', planKey: 'studio' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('lets a listed, verified ADMIN in, matching case-insensitively', async () => {
    expect(await callerFor(admin('YANN@facile.studio')).features()).toEqual([{ key: 'glouton.access' }] as never);
    expect(await callerFor(admin('someone@client.fr')).access()).toEqual({ staff: false });
    expect(await callerFor(admin('noah@facile.studio')).access()).toEqual({ staff: true });
  });
});
