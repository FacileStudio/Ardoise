import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { spaceRouter } from './router';
import spaceService from './service';

describe('adding a member who has no account', () => {
  it('is refused with NOT_FOUND, never turned into a client invitation', async () => {
    const db = {
      spaceMember: { findUnique: async () => ({ role: 'ADMIN' }) },
      user: { findUnique: async () => null },
    } as unknown as PrismaClient;

    await expect(
      spaceService.addMember(db, 'admin-1', { spaceId: 's1', email: 'new@example.test', role: 'MEMBER' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('exposes no space invitation procedure', () => {
    expect(Object.keys(spaceRouter._def.procedures)).not.toContain('inviteMember');
  });
});
