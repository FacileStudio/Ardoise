import { router, protectedProcedure } from '../../trpc';
import spaceService from './service';
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
    return spaceService.list(ctx.db, ctx.user.id);
  }),

  get: protectedProcedure.input(GetSpaceSchema).query(async ({ ctx, input }) => {
    return spaceService.get(ctx.db, input.id, ctx.user.id);
  }),

  create: protectedProcedure.input(CreateSpaceSchema).mutation(async ({ ctx, input }) => {
    return spaceService.create(ctx.db, ctx.user.id, input);
  }),

  update: protectedProcedure.input(UpdateSpaceSchema).mutation(async ({ ctx, input }) => {
    return spaceService.update(ctx.db, ctx.user.id, input);
  }),

  delete: protectedProcedure.input(GetSpaceSchema).mutation(async ({ ctx, input }) => {
    return spaceService.delete(ctx.db, ctx.user.id, input.id);
  }),

  getMembers: protectedProcedure.input(GetSpaceSchema).query(async ({ ctx, input }) => {
    return spaceService.getMembers(ctx.db, ctx.user.id, input.id);
  }),

  addMember: protectedProcedure.input(AddMemberSchema).mutation(async ({ ctx, input }) => {
    return spaceService.addMember(ctx.db, ctx.user.id, input);
  }),

  removeMember: protectedProcedure.input(RemoveMemberSchema).mutation(async ({ ctx, input }) => {
    return spaceService.removeMember(ctx.db, ctx.user.id, input);
  }),

  updateMemberRole: protectedProcedure
    .input(UpdateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      return spaceService.updateMemberRole(ctx.db, ctx.user.id, input);
    }),

  leave: protectedProcedure.input(LeaveSpaceSchema).mutation(async ({ ctx, input }) => {
    return spaceService.leave(ctx.db, ctx.user.id, input.spaceId);
  }),
});

export default spaceRouter;
