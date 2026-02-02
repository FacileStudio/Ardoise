import type { PrismaClient } from '@repo/database';
import { EventEmitter } from 'events';
import { TRPCError } from '@trpc/server';

export const chatEvents = new EventEmitter();

export const chatService = {
  async canAccessRoom(db: PrismaClient, userId: string, roomId: string) {
    const participant = await db.roomParticipant.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    return !!participant;
  },

  async createMessage(
    db: PrismaClient,
    userId: string,
    roomId: string,
    text: string,
    attachmentKeys: string[] = []
  ) {
    const message = await db.message.create({
      data: {
        text,
        userId,
        roomId,
        attachments: {
          connect: attachmentKeys.map((key) => ({ key })),
        },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        attachments: true,
      },
    });

    chatEvents.emit(`room:${roomId}`, message);
    return message;
  },

  async listMessages(db: PrismaClient, roomId: string, limit = 50) {
    return await db.message.findMany({
      where: { roomId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        attachments: true,
      },
    });
  },

  async getMyRooms(db: PrismaClient, userId: string) {
    return db.room.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async getOrCreateDirectMessage(db: PrismaClient, userAId: string, userBId: string) {
    const existingRoom = await db.room.findFirst({
      where: {
        isGroup: false,
        participants: {
          every: { userId: { in: [userAId, userBId] } },
        },
      },
      include: { participants: true },
    });

    if (existingRoom) return existingRoom;

    return await db.room.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
    });
  },

  async createGroup(db: PrismaClient, name: string, participantIds: string[]) {
    return await db.room.create({
      data: {
        name,
        isGroup: true,
        participants: {
          create: participantIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
  },

  async inviteMember(db: PrismaClient, roomId: string, email: string) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

    const existing = await db.roomParticipant.findUnique({
      where: { userId_roomId: { userId: user.id, roomId } },
    });
    if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Already a member' });

    return await db.roomParticipant.create({
      data: { userId: user.id, roomId },
    });
  },

  async leaveRoom(db: PrismaClient, userId: string, roomId: string) {
    return await db.roomParticipant.delete({
      where: { userId_roomId: { userId, roomId } },
    });
  },

  async kickMember(db: PrismaClient, roomId: string, targetUserId: string) {
    const room = await db.room.findUnique({ where: { id: roomId } });
    if (!room?.isGroup) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot kick in DM' });

    return await db.roomParticipant.delete({
      where: { userId_roomId: { userId: targetUserId, roomId } },
    });
  },

  async deleteRoom(db: PrismaClient, roomId: string) {
    return await db.room.delete({ where: { id: roomId } });
  },

  sendTypingEvent(roomId: string, userId: string, userName: string, isTyping: boolean) {
    chatEvents.emit(`typing:${roomId}`, { userId, userName, isTyping });
  },
};
