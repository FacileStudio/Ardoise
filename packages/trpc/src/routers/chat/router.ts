import { z } from 'zod';
import { router, protectedProcedure } from '../../context';
import { chatService, chatEvents } from './service';
import { observable } from '@trpc/server/observable';
import { TRPCError } from '@trpc/server';

export const chatRouter = router({
  send: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        text: z.string().min(1),
        attachmentKeys: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const allowed = await chatService.canAccessRoom(ctx.db, ctx.user.id, input.roomId);
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' });

      return chatService.createMessage(
        ctx.db,
        ctx.user.id,
        input.roomId,
        input.text,
        input.attachmentKeys
      );
    }),

  getHistory: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const allowed = await chatService.canAccessRoom(ctx.db, ctx.user.id, input.roomId);
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' });

      return chatService.listMessages(ctx.db, input.roomId);
    }),

  onMessage: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .subscription(async ({ ctx, input }) => {
      const allowed = await chatService.canAccessRoom(ctx.db, ctx.user.id, input.roomId);
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' });

      return observable((emit) => {
        const handler = (data: any) => emit.next(data);
        const channel = `room:${input.roomId}`;
        chatEvents.on(channel, handler);
        return () => chatEvents.off(channel, handler);
      });
    }),

  getMyRooms: protectedProcedure.query(({ ctx }) => {
    return chatService.getMyRooms(ctx.db, ctx.user.id);
  }),

  startPrivateMessage: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.user.findUnique({ where: { email: input.email } });
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' });
      if (target.id === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST' });

      return chatService.getOrCreateDirectMessage(ctx.db, ctx.user.id, target.id);
    }),

  createGroup: protectedProcedure
    .input(z.object({ name: z.string().min(3) }))
    .mutation(({ ctx, input }) => {
      return chatService.createGroup(ctx.db, input.name, [ctx.user.id]);
    }),

  inviteMember: protectedProcedure
    .input(z.object({ roomId: z.string(), email: z.string().email() }))
    .mutation(({ ctx, input }) => {
      return chatService.inviteMember(ctx.db, input.roomId, input.email);
    }),

  leaveRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(({ ctx, input }) => {
      return chatService.leaveRoom(ctx.db, ctx.user.id, input.roomId);
    }),

  kickMember: protectedProcedure
    .input(z.object({ roomId: z.string(), userId: z.string() }))
    .mutation(({ ctx, input }) => {
      return chatService.kickMember(ctx.db, input.roomId, input.userId);
    }),

  setTyping: protectedProcedure
    .input(z.object({ roomId: z.string(), isTyping: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      chatService.sendTypingEvent(
        input.roomId,
        ctx.user.id,
        ctx.user.name || 'Unknown',
        input.isTyping
      );
    }),

  onTyping: protectedProcedure.input(z.object({ roomId: z.string() })).subscription(({ input }) => {
    return observable<{ userId: string; userName: string; isTyping: boolean }>((emit) => {
      const handler = (data: any) => emit.next(data);
      const channel = `typing:${input.roomId}`;
      chatEvents.on(channel, handler);
      return () => chatEvents.off(channel, handler);
    });
  }),

  deleteRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(({ ctx, input }) => {
      return chatService.deleteRoom(ctx.db, input.roomId);
    }),
});

export default chatRouter;
