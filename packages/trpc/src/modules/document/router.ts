import { router, adminProcedure } from '../../trpc';
import { DocumentDataSchema, generateDocument, generateTypstContent } from './service';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const documentRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        type: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize, search, type } = input;
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { clientName: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { quoteNumber: { contains: search, mode: 'insensitive' } },
          { contractRef: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (type) {
        where.type = type;
      }

      const [items, total] = await Promise.all([
        ctx.db.document.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            createdByUser: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        ctx.db.document.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const document = await ctx.db.document.findUnique({
        where: { id: input.id },
        include: {
          createdByUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }

      return document;
    }),

  create: adminProcedure
    .input(DocumentDataSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        let logoUrl: string | undefined;
        if (input.providerId) {
          const provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
            select: { logoUrl: true },
          });
          logoUrl = provider?.logoUrl || undefined;
        }

        const pdfBuffer = await generateDocument(input, logoUrl);

        const fileName = `${input.type}_${input.invoice_number || input.quote_number || input.contract_reference || 'document'}.pdf`;

        const subtotal = input.items.reduce(
          (sum: number, item: any) => sum + item.quantity * item.price,
          0
        );
        const totalWithRailway = subtotal + (input.railway_estimate || 0);
        const tva = totalWithRailway * (input.tva_rate / 100);
        const total = totalWithRailway + tva;

        const document = await ctx.db.document.create({
          data: {
            type: input.type,
            name: fileName,
            invoiceNumber: input.invoice_number,
            quoteNumber: input.quote_number,
            contractRef: input.contract_reference,
            clientName: input.client_name,
            clientSiret: input.client_siret,
            clientAddress: input.client_address,
            clientCity: input.client_city,
            clientCountry: input.client_country,
            providerId: input.providerId,
            providerName: input.provider_name,
            providerLegal: input.provider_legal,
            providerSiret: input.provider_siret,
            providerAddress: input.provider_address,
            providerCity: input.provider_city,
            providerEmail: input.provider_email,
            providerPhone: input.provider_phone,
            items: input.items,
            subtotal,
            tva,
            total,
            tvaRate: input.tva_rate,
            railwayEstimate: input.railway_estimate,
            fileSize: pdfBuffer.length,
            createdBy: ctx.user!.id,
          },
        });

        return {
          document,
          pdf: pdfBuffer.toString('base64'),
          fileName,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create document',
        });
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const document = await ctx.db.document.findUnique({
        where: { id: input.id },
      });

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }

      await ctx.db.document.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  preview: adminProcedure
    .input(DocumentDataSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        let logoUrl: string | undefined;
        if (input.providerId) {
          const provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
            select: { logoUrl: true },
          });
          logoUrl = provider?.logoUrl || undefined;
        }

        const pdfBuffer = await generateDocument(input, logoUrl);
        return {
          pdf: pdfBuffer.toString('base64'),
          typstContent: generateTypstContent(input)
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate preview',
        });
      }
    }),

  generate: adminProcedure
    .input(DocumentDataSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        let logoUrl: string | undefined;
        if (input.providerId) {
          const provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
            select: { logoUrl: true },
          });
          logoUrl = provider?.logoUrl || undefined;
        }

        const pdfBuffer = await generateDocument(input, logoUrl);

        const fileName = `${input.type}_${input.invoice_number || input.quote_number || input.contract_reference || 'document'}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate document',
        });
      }
    }),

  types: adminProcedure.query(() => {
    return [
      { value: 'prestation', label: 'Facture Prestation' },
      { value: 'maintenance', label: 'Devis Maintenance' },
      { value: 'contrat_prestation', label: 'Contrat Prestation' },
      { value: 'contrat_maintenance', label: 'Contrat Maintenance' },
      { value: 'back_contractuel', label: 'Back Contractuel (Co-traitance)' },
      { value: 'appel_de_fonds', label: 'Appel de Fonds Global' },
    ];
  }),

  download: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const document = await ctx.db.document.findUnique({
        where: { id: input.id },
      });

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }

      try {
        let logoUrl: string | undefined;
        if (document.providerId) {
          const provider = await ctx.db.provider.findUnique({
            where: { id: document.providerId },
            select: { logoUrl: true },
          });
          logoUrl = provider?.logoUrl || undefined;
        }

        const documentData = {
          type: document.type as any,
          invoice_number: document.invoiceNumber || '',
          quote_number: document.quoteNumber || '',
          contract_reference: document.contractRef || '',
          client_name: document.clientName,
          client_siret: document.clientSiret || '',
          client_address: document.clientAddress || '',
          client_city: document.clientCity || '',
          client_country: document.clientCountry || '',
          provider_name: document.providerName,
          provider_legal: document.providerLegal || '',
          provider_siret: document.providerSiret || '',
          provider_address: document.providerAddress || '',
          provider_city: document.providerCity || '',
          provider_email: document.providerEmail || '',
          provider_phone: document.providerPhone || '',
          items: document.items as any[],
          tva_rate: document.tvaRate,
          railway_estimate: Number(document.railwayEstimate || 0),
        };

        const pdfBuffer = await generateDocument(documentData, logoUrl);

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName: document.name,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to download document',
        });
      }
    }),
});
