import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/types';
import type { AuthManager } from '@repo/auth';
import invitationService from './service';

const invitation = (role: 'ADMIN' | 'CLIENT') => ({
  id: 'inv-1',
  email: 'new@example.test',
  role,
  spaceId: null,
  spaceRole: null,
  expiresAt: new Date(Date.now() + 60_000),
  space: null,
});

const db = (role: 'ADMIN' | 'CLIENT') =>
  ({
    invitation: { findUnique: async () => invitation(role) },
    user: { findFirst: async () => ({ id: 'existing' }) },
  }) as unknown as PrismaClient;

const input = { token: 't', firstName: 'A', lastName: 'B', password: 'long-enough-pass' };
const outcome = (p: Promise<unknown>) => p.then(() => 'ok', (e: Error) => e.message);

describe('invitation.accept with SSO_ONLY', () => {
  it('refuses a staff invitation before any account is created', async () => {
    const message = await outcome(
      invitationService.accept(db('ADMIN'), {} as AuthManager, input, undefined, true)
    );
    expect(message).toContain('SSO-only');
  });

  it('lets a client invitation through to the normal checks', async () => {
    const message = await outcome(
      invitationService.accept(db('CLIENT'), {} as AuthManager, input, undefined, true)
    );
    expect(message).toContain('account already exists');
  });

  it('keeps staff invitations working when the mode is off', async () => {
    const message = await outcome(
      invitationService.accept(db('ADMIN'), {} as AuthManager, input, undefined, false)
    );
    expect(message).toContain('account already exists');
  });
});
