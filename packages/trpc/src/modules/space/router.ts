import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, memberProcedure, platformStaffProcedure } from '../../trpc';
import spaceService from './service';
import { manageUrl, refuseCreateWhenManaged, refuseWhenLinked, registreSpacesUrl } from './registre';
import {
  CreateSpaceSchema,
  UpdateSpaceSchema,
  GetSpaceSchema,
  AddMemberSchema,
  RemoveMemberSchema,
  UpdateMemberRoleSchema,
  LeaveSpaceSchema,
  UpdateSpaceSettingsSchema,
} from './types';

export const spaceRouter = router({
  list: memberProcedure.query(async ({ ctx }) => {
    const spaces = await spaceService.list(ctx.db, ctx.user.id);
    return spaces.map((space) => ({ ...space, manageUrl: manageUrl(ctx.env, space.registreSpaceId) }));
  }),

  directory: memberProcedure.query(({ ctx }) => ({ spacesUrl: registreSpacesUrl(ctx.env) })),

  get: memberProcedure.input(GetSpaceSchema).query(async ({ ctx, input }) => {
    const space = await spaceService.get(ctx.db, input.id, ctx.user.id);
    return { ...space, manageUrl: manageUrl(ctx.env, space.registreSpaceId) };
  }),

  create: memberProcedure.input(CreateSpaceSchema).mutation(async ({ ctx, input }) => {
    refuseCreateWhenManaged(ctx.env);
    return spaceService.create(ctx.db, ctx.user.id, input);
  }),

  update: memberProcedure.input(UpdateSpaceSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.id, ctx.user.id);
    if (input.name !== undefined) await refuseWhenLinked(ctx.db, ctx.env, input.id, input.name);
    return spaceService.update(ctx.db, ctx.user.id, input);
  }),

  getSettings: memberProcedure.input(GetSpaceSchema).query(({ ctx, input }) => {
    return spaceService.getSettings(ctx.db, ctx.user.id, input.id);
  }),

  updateSettings: memberProcedure.input(UpdateSpaceSettingsSchema).mutation(({ ctx, input }) => {
    return spaceService.updateSettings(
      ctx.db,
      { userId: ctx.user.id, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
      input
    );
  }),

  delete: memberProcedure.input(GetSpaceSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.id, ctx.user.id);
    await refuseWhenLinked(ctx.db, ctx.env, input.id);
    return spaceService.delete(ctx.db, ctx.user.id, input.id);
  }),

  getMembers: memberProcedure.input(GetSpaceSchema).query(async ({ ctx, input }) => {
    return spaceService.getMembers(ctx.db, ctx.user.id, input.id);
  }),

  addMember: memberProcedure.input(AddMemberSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.spaceId, ctx.user.id);
    await refuseWhenLinked(ctx.db, ctx.env, input.spaceId);
    return spaceService.addMember(ctx.db, ctx.user.id, input);
  }),

  removeMember: memberProcedure.input(RemoveMemberSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.spaceId, ctx.user.id);
    await refuseWhenLinked(ctx.db, ctx.env, input.spaceId);
    return spaceService.removeMember(ctx.db, ctx.user.id, input);
  }),

  updateMemberRole: memberProcedure
    .input(UpdateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      await spaceService.get(ctx.db, input.spaceId, ctx.user.id);
      await refuseWhenLinked(ctx.db, ctx.env, input.spaceId);
      return spaceService.updateMemberRole(ctx.db, ctx.user.id, input);
    }),

  /**
   * Marks a space as the platform studio's, or not: only such a space may use
   * the platform Stripe account, SMTP, Plume, Nuage and the shared providers.
   * Platform staff only, whatever their role in the space.
   */
  setPlatformStudio: platformStaffProcedure
    .input(z.object({ id: z.string().min(1), platformStudio: z.boolean() }).strict())
    .mutation(async ({ ctx, input }) => {
      const space = await ctx.db.space.findUnique({ where: { id: input.id }, select: { platformStudio: true } });
      if (!space) throw new TRPCError({ code: 'NOT_FOUND', message: 'Space not found' });
      const [updated] = await ctx.db.$transaction([
        ctx.db.space.update({
          where: { id: input.id },
          data: { platformStudio: input.platformStudio },
          select: { id: true, platformStudio: true },
        }),
        ctx.db.auditLog.create({
          data: {
            userId: ctx.user.id,
            entity: 'space',
            entityId: input.id,
            action: 'UPDATE',
            changes: { platformStudio: { before: space.platformStudio, after: input.platformStudio } },
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          },
        }),
      ]);
      return updated;
    }),

  leave: memberProcedure.input(LeaveSpaceSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.spaceId, ctx.user.id);
    await refuseWhenLinked(ctx.db, ctx.env, input.spaceId);
    return spaceService.leave(ctx.db, ctx.user.id, input.spaceId);
  }),
});

export default spaceRouter;
