import { z } from 'zod';
import { router, adminProcedure } from '../../trpc';
import {
  submissionStatusSchema,
} from '@repo/docuseal';

export const docusealRouter = router({
  isConfigured: adminProcedure.query(async ({ ctx }) => {
    return ctx.docuseal.isConfigured();
  }),

  listSubmissions: adminProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        after: z.number().optional(),
        before: z.number().optional(),
        template_id: z.number().optional(),
        status: submissionStatusSchema.optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.docuseal.listSubmissions(input);
    }),

  getSubmission: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.docuseal.getSubmission(input.id);
    }),

  createSubmission: adminProcedure
    .input(
      z.object({
        template_id: z.number(),
        send_email: z.boolean().optional(),
        send_sms: z.boolean().optional(),
        submitters: z.array(
          z.object({
            role: z.string(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            name: z.string().optional(),
            values: z.record(z.any()).optional(),
            metadata: z.record(z.any()).optional(),
          })
        ),
        reply_to: z.string().email().optional(),
        message: z.object({
          subject: z.string().optional(),
          body: z.string().optional(),
        }).optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.docuseal.createSubmission(input);
    }),

  createSubmissionFromPdf: adminProcedure
    .input(
      z.object({
        name: z.string(),
        send_email: z.boolean().optional(),
        send_sms: z.boolean().optional(),
        files: z.array(
          z.object({
            name: z.string(),
            url: z.string().url(),
          })
        ),
        submitters: z.array(
          z.object({
            role: z.string(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            name: z.string().optional(),
          })
        ),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.docuseal.createSubmissionFromPdf(input);
    }),

  deleteSubmission: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.docuseal.deleteSubmission(input.id);
    }),

  listTemplates: adminProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        after: z.number().optional(),
        before: z.number().optional(),
        folder: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.docuseal.listTemplates(input);
    }),

  getTemplate: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.docuseal.getTemplate(input.id);
    }),

  getSubmitter: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.docuseal.getSubmitter(input.id);
    }),

  updateSubmitter: adminProcedure
    .input(
      z.object({
        id: z.number(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        values: z.record(z.any()).optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...params } = input;
      return ctx.docuseal.updateSubmitter(id, params);
    }),
});
