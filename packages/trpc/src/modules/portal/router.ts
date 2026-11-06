import { router, clientProcedure } from '../../trpc';
import portalService from './service';
import { PortalDocumentIdSchema, PortalDocumentsInputSchema } from './types';

export const portalRouter = router({
  overview: clientProcedure.query(({ ctx }) => portalService.overview(ctx.db, ctx.user.id)),

  documents: clientProcedure
    .input(PortalDocumentsInputSchema)
    .query(({ ctx, input }) => portalService.listDocuments(ctx.db, ctx.user.id, input)),

  documentDownload: clientProcedure
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

  signLink: clientProcedure
    .input(PortalDocumentIdSchema)
    .mutation(({ ctx, input }) =>
      portalService.signLink(ctx.db, ctx.user.id, ctx.user.email, input.id, ctx.env)
    ),
});

export default portalRouter;
