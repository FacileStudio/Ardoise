import { router, protectedProcedure } from '../../trpc';
import portalService from './service';
import { PortalDocumentIdSchema, PortalDocumentsInputSchema } from './types';

export const portalRouter = router({
  overview: protectedProcedure.query(({ ctx }) => portalService.overview(ctx.db, ctx.user.id)),

  documents: protectedProcedure
    .input(PortalDocumentsInputSchema)
    .query(({ ctx, input }) => portalService.listDocuments(ctx.db, ctx.user.id, input)),

  documentDownload: protectedProcedure
    .input(PortalDocumentIdSchema)
    .query(({ ctx, input }) =>
      portalService.documentDownload(
        ctx.db,
        ctx.user.id,
        input.id,
        ctx.apiOrigin,
        ctx.env.ENCRYPTION_SECRET
      )
    ),

  signLink: protectedProcedure
    .input(PortalDocumentIdSchema)
    .mutation(({ ctx, input }) =>
      portalService.signLink(ctx.db, ctx.user.id, ctx.user.email, input.id, ctx.env)
    ),
});

export default portalRouter;
