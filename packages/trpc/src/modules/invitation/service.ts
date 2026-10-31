import { createHash, randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/types';
import type { AuthManager } from '@repo/auth';
import { EmailTemplates, type SMTPClient } from '@repo/smtp';
import { logger } from '@repo/logger';
import {
  issueSession,
  sessionUserSelection,
  toSessionUser,
  type SessionMeta,
} from '../auth/session';
import type { AcceptInvitationInput } from './types';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const refuseStaffInvitation = (ssoOnly: boolean | undefined, role: string) => {
  if (ssoOnly && role !== 'CLIENT') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Staff accounts are created by an administrator when SSO-only mode is on',
    });
  }
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

interface InvitationTarget {
  email: string;
  role: 'CLIENT' | 'ADMIN';
  spaceId?: string;
  spaceRole?: 'ADMIN' | 'MEMBER';
}

interface Inviter {
  id: string;
  name: string;
}

async function loadInviter(db: PrismaClient, id: string): Promise<Inviter> {
  const user = await db.user.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });

  return { id, name: `${user.firstName} ${user.lastName}`.trim() };
}

async function findPending(db: PrismaClient, token: string) {
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { space: { select: { name: true } } },
  });

  if (!invitation || invitation.expiresAt < new Date()) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'This invitation is invalid or has expired' });
  }

  return invitation;
}

async function deliver(
  smtp: SMTPClient,
  appOrigin: string,
  inviter: Inviter,
  invitation: { email: string; role: string; space?: { name: string } | null },
  token: string
) {
  await new EmailTemplates(smtp).sendInvitation({
    to: invitation.email,
    inviterName: inviter.name,
    inviteLink: `${appOrigin}/invite/${token}`,
    spaceName: invitation.space?.name,
    asAdmin: invitation.role === 'ADMIN',
  });
}

export const invitationService = {
  async create(
    db: PrismaClient,
    smtp: SMTPClient,
    appOrigin: string,
    inviterId: string,
    target: InvitationTarget,
    ssoOnly?: boolean
  ) {
    refuseStaffInvitation(ssoOnly, target.role);
    const inviter = await loadInviter(db, inviterId);
    const email = target.email.trim().toLowerCase();

    const existing = await db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'A user with this email already exists' });
    }

    const token = randomBytes(32).toString('hex');
    const spaceId = target.spaceId ?? null;

    const [, invitation] = await db.$transaction([
      db.invitation.deleteMany({ where: { email, spaceId } }),
      db.invitation.create({
        data: {
          email,
          tokenHash: hashToken(token),
          role: target.role,
          spaceId,
          spaceRole: spaceId ? (target.spaceRole ?? 'MEMBER') : null,
          invitedById: inviter.id,
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
        include: { space: { select: { name: true } } },
      }),
    ]);

    try {
      await deliver(smtp, appOrigin, inviter, invitation, token);
    } catch (err) {
      logger.error({ err, email }, 'Failed to send invitation email');
      await db.invitation.delete({ where: { id: invitation.id } });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not send the invitation email',
      });
    }

    return { id: invitation.id, email, expiresAt: invitation.expiresAt };
  },

  async listPending(db: PrismaClient) {
    return db.invitation.findMany({
      where: { expiresAt: { gt: new Date() }, spaceId: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { firstName: true, lastName: true } },
      },
    });
  },

  async revoke(db: PrismaClient, id: string) {
    await db.invitation.deleteMany({ where: { id } });
    return { success: true };
  },

  async resend(
    db: PrismaClient,
    smtp: SMTPClient,
    appOrigin: string,
    inviterId: string,
    id: string
  ) {
    const inviter = await loadInviter(db, inviterId);
    const invitation = await db.invitation.findUnique({
      where: { id },
      include: { space: { select: { name: true } } },
    });
    if (!invitation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
    }

    const token = randomBytes(32).toString('hex');
    await db.invitation.update({
      where: { id },
      data: {
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });

    await deliver(smtp, appOrigin, inviter, invitation, token);
    return { success: true };
  },

  async preview(db: PrismaClient, token: string) {
    const invitation = await findPending(db, token);
    return {
      email: invitation.email,
      role: invitation.role,
      spaceName: invitation.space?.name ?? null,
    };
  },

  async accept(
    db: PrismaClient,
    auth: AuthManager,
    input: AcceptInvitationInput,
    meta?: SessionMeta,
    ssoOnly?: boolean
  ) {
    const invitation = await findPending(db, input.token);
    refuseStaffInvitation(ssoOnly, invitation.role);

    const existing = await db.user.findFirst({
      where: { email: { equals: invitation.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'An account already exists for this email, please log in',
      });
    }

    const password = await auth.hashPassword(input.password);

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          firstName: input.firstName,
          lastName: input.lastName,
          password,
          role: invitation.role,
          emailVerified: true,
        },
        select: sessionUserSelection,
      });

      if (invitation.spaceId) {
        await tx.spaceMember.create({
          data: {
            spaceId: invitation.spaceId,
            userId: created.id,
            role: invitation.spaceRole ?? 'MEMBER',
          },
        });
      }

      await tx.invitation.delete({ where: { id: invitation.id } });
      return created;
    });

    return issueSession(db, auth, toSessionUser(user), meta);
  },
};

export default invitationService;
