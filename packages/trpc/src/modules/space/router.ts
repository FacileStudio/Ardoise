import { router, protectedProcedure } from '../../trpc';
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
} from './types';

export const spaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const spaces = await spaceService.list(ctx.db, ctx.user.id);
    return spaces.map((space) => ({ ...space, manageUrl: manageUrl(ctx.env, space.registreSpaceId) }));
  }),

  directory: protectedProcedure.query(({ ctx }) => ({ spacesUrl: registreSpacesUrl(ctx.env) })),

  get: protectedProcedure.input(GetSpaceSchema).query(async ({ ctx, input }) => {
    const space = await spaceService.get(ctx.db, input.id, ctx.user.id);
    return { ...space, manageUrl: manageUrl(ctx.env, space.registreSpaceId) };
  }),

  create: protectedProcedure.input(CreateSpaceSchema).mutation(async ({ ctx, input }) => {
    refuseCreateWhenManaged(ctx.env);
    return spaceService.create(ctx.db, ctx.user.id, input);
  }),

  update: protectedProcedure.input(UpdateSpaceSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.id, ctx.user.id);
    if (input.name !== undefined) await refuseWhenLinked(ctx.db, ctx.env, input.id, input.name);
    return spaceService.update(ctx.db, ctx.user.id, input);
  }),

  delete: protectedProcedure.input(GetSpaceSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.id, ctx.user.id);
    await refuseWhenLinked(ctx.db, ctx.env, input.id);
    return spaceService.delete(ctx.db, ctx.user.id, input.id);
  }),

  getMembers: protectedProcedure.input(GetSpaceSchema).query(async ({ ctx, input }) => {
    return spaceService.getMembers(ctx.db, ctx.user.id, input.id);
  }),

  addMember: protectedProcedure.input(AddMemberSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.spaceId, ctx.user.id);
    await refuseWhenLinked(ctx.db, ctx.env, input.spaceId);
    return spaceService.addMember(ctx.db, ctx.user.id, input);
  }),

  removeMember: protectedProcedure.input(RemoveMemberSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.spaceId, ctx.user.id);
    await refuseWhenLinked(ctx.db, ctx.env, input.spaceId);
    return spaceService.removeMember(ctx.db, ctx.user.id, input);
  }),

  updateMemberRole: protectedProcedure
    .input(UpdateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      await spaceService.get(ctx.db, input.spaceId, ctx.user.id);
      await refuseWhenLinked(ctx.db, ctx.env, input.spaceId);
      await spaceService.get(ctx.db, input.spaceId, ctx.user.id);
    await refuseWhenLinked(ctx.db, ctx.env, input.spaceId);
    return spaceService.updateMemberRole(ctx.db, ctx.user.id, input);
    }),

  leave: protectedProcedure.input(LeaveSpaceSchema).mutation(async ({ ctx, input }) => {
    await spaceService.get(ctx.db, input.spaceId, ctx.user.id);
    await refuseWhenLinked(ctx.db, ctx.env, input.spaceId);
    return spaceService.leave(ctx.db, ctx.user.id, input.spaceId);
  }),
});

export default spaceRouter;
