import { TRPCError } from '@trpc/server';
import { type PrismaClient, type SpaceRole } from '@repo/database';
import type {
  CreateSpaceInput,
  UpdateSpaceInput,
  AddMemberInput,
  RemoveMemberInput,
  UpdateMemberRoleInput,
  Scope,
} from './types';

const ROLE_WEIGHT: Record<SpaceRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

function requireRole(member: { role: SpaceRole } | null, minimum: SpaceRole): void {
  if (!member) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this space' });
  }
  if (ROLE_WEIGHT[member.role] < ROLE_WEIGHT[minimum]) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
  }
}

export function scopeWhere(scope: Scope): { spaceId: string | null } {
  return scope.type === 'space' ? { spaceId: scope.spaceId } : { spaceId: null };
}

export async function requireRowScope<T extends { spaceId: string | null }>(
  db: PrismaClient,
  userId: string,
  row: T | null | undefined,
  message: string
): Promise<T> {
  if (row) {
    try {
      await spaceService.resolveScope(db, userId, row.spaceId);
      return row;
    } catch (error) {
      if (!(error instanceof TRPCError) || error.code !== 'FORBIDDEN') {
        throw error;
      }
    }
  }

  throw new TRPCError({ code: 'NOT_FOUND', message });
}

export async function requireRowsScope<T extends { spaceId: string | null }>(
  db: PrismaClient,
  userId: string,
  rows: T[],
  message: string
): Promise<T[]> {
  for (const row of rows) {
    await requireRowScope(db, userId, row, message);
  }
  return rows;
}

export const spaceService = {
  async resolveScope(db: PrismaClient, userId: string, spaceId?: string | null): Promise<Scope> {
    if (!spaceId) {
      return { type: 'personal', userId };
    }

    const member = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });

    if (!member) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this space' });
    }

    return { type: 'space', spaceId, userId };
  },

  async list(db: PrismaClient, userId: string) {
    const memberships = await db.spaceMember.findMany({
      where: { userId },
      include: {
        space: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.space,
      role: m.role,
      joinedAt: m.joinedAt,
      memberCount: m.space._count.members,
    }));
  },

  async get(db: PrismaClient, spaceId: string, userId: string) {
    const member = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });

    if (!member) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this space' });
    }

    const space = await db.space.findUnique({
      where: { id: spaceId },
      include: {
        _count: {
          select: {
            members: true,
            clients: true,
            documents: true,
            payments: true,
          },
        },
      },
    });

    if (!space) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Space not found' });
    }

    return { ...space, role: member.role };
  },

  async create(db: PrismaClient, userId: string, data: CreateSpaceInput) {
    return db.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: {
          name: data.name,
          description: data.description ?? null,
        },
      });

      await tx.spaceMember.create({
        data: {
          spaceId: space.id,
          userId,
          role: 'OWNER',
        },
      });

      return space;
    });
  },

  async update(db: PrismaClient, userId: string, data: UpdateSpaceInput) {
    const member = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: data.id, userId } },
    });
    requireRole(member, 'ADMIN');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    return db.space.update({
      where: { id: data.id },
      data: updateData,
    });
  },

  async delete(db: PrismaClient, userId: string, spaceId: string) {
    const member = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    requireRole(member, 'OWNER');

    await db.space.delete({ where: { id: spaceId } });
    return { success: true };
  },

  async getMembers(db: PrismaClient, userId: string, spaceId: string) {
    const member = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });

    if (!member) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this space' });
    }

    return db.spaceMember.findMany({
      where: { spaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  },

  async addMember(db: PrismaClient, userId: string, data: AddMemberInput) {
    const member = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: data.spaceId, userId } },
    });
    requireRole(member, 'ADMIN');

    if (data.role === 'OWNER') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot assign OWNER role directly' });
    }

    const targetUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (!targetUser) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No user found with this email' });
    }

    const existing = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: data.spaceId, userId: targetUser.id } },
    });

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'User is already a member of this space' });
    }

    return db.spaceMember.create({
      data: {
        spaceId: data.spaceId,
        userId: targetUser.id,
        role: data.role ?? 'MEMBER',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  },

  async removeMember(db: PrismaClient, userId: string, data: RemoveMemberInput) {
    const member = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: data.spaceId, userId } },
    });
    requireRole(member, 'ADMIN');

    const target = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: data.spaceId, userId: data.userId } },
    });

    if (!target) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
    }

    if (target.role === 'OWNER') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove the space owner' });
    }

    await db.spaceMember.delete({
      where: { spaceId_userId: { spaceId: data.spaceId, userId: data.userId } },
    });

    return { success: true };
  },

  async updateMemberRole(db: PrismaClient, userId: string, data: UpdateMemberRoleInput) {
    const member = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: data.spaceId, userId } },
    });
    requireRole(member, 'OWNER');

    if (data.role === 'OWNER') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot assign OWNER role. Transfer ownership instead.',
      });
    }

    const target = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: data.spaceId, userId: data.userId } },
    });

    if (!target) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
    }

    if (target.role === 'OWNER') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: "Cannot change the owner's role" });
    }

    return db.spaceMember.update({
      where: { spaceId_userId: { spaceId: data.spaceId, userId: data.userId } },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  },

  async leave(db: PrismaClient, userId: string, spaceId: string) {
    const member = await db.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });

    if (!member) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Not a member of this space' });
    }

    if (member.role === 'OWNER') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Owner cannot leave the space. Transfer ownership or delete the space.',
      });
    }

    await db.spaceMember.delete({
      where: { spaceId_userId: { spaceId, userId } },
    });

    return { success: true };
  },
};

export default spaceService;
