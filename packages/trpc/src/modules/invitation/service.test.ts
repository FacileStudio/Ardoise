import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import type { SMTPClient } from '@repo/smtp';
import invitationService from './service';

function fixtures(invitation: { spaceId: string | null } | null, role: string | null) {
  const deleted: string[] = [];
  const sent: string[] = [];
  const db = {
    user: { findUnique: async () => ({ firstName: 'A', lastName: 'B' }) },
    invitation: {
      findUnique: async () => (invitation ? { id: 'i1', email: 'x@y.fr', role: 'CLIENT', ...invitation } : null),
      deleteMany: async () => deleted.push('i1'),
      update: async () => ({}),
    },
    spaceMember: { findUnique: async () => (role ? { role } : null) },
  } as unknown as PrismaClient;
  const smtp = { sendEmail: async () => sent.push('mail') } as unknown as SMTPClient;
  return { db, smtp, deleted, sent };
}

describe('invitation management scope', () => {
  it('lets any admin revoke a platform invitation', async () => {
    const { db, deleted } = fixtures({ spaceId: null }, null);

    await invitationService.revoke(db, 'admin-1', 'i1');

    expect(deleted).toEqual(['i1']);
  });

  it('refuses to revoke a space invitation from outside that space', async () => {
    const { db, deleted } = fixtures({ spaceId: 's1' }, null);

    await expect(invitationService.revoke(db, 'admin-1', 'i1')).rejects.toThrow('Invitation not found');
    expect(deleted).toEqual([]);
  });

  it('refuses a plain space member', async () => {
    const { db, deleted } = fixtures({ spaceId: 's1' }, 'MEMBER');

    await expect(invitationService.revoke(db, 'u1', 'i1')).rejects.toThrow();
    expect(deleted).toEqual([]);
  });

  it('lets a space admin revoke and resend', async () => {
    const { db, smtp, deleted, sent } = fixtures({ spaceId: 's1' }, 'ADMIN');

    await invitationService.revoke(db, 'u1', 'i1');
    await invitationService.resend(db, smtp, 'http://app', 'u1', 'i1');

    expect(deleted).toEqual(['i1']);
    expect(sent).toEqual(['mail']);
  });

  it('refuses to resend a space invitation from outside that space', async () => {
    const { db, smtp, sent } = fixtures({ spaceId: 's1' }, null);

    await expect(invitationService.resend(db, smtp, 'http://app', 'admin-1', 'i1')).rejects.toThrow();
    expect(sent).toEqual([]);
  });
});
