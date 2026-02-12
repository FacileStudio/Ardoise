import { router, adminProcedure } from '../../trpc';
import {
  DocumentDataSchema,
  generateDocument,
  generateTypstContent,
  ContratPrestationInputSchema,
  ContratMaintenanceInputSchema,
  BackContractuelInputSchema,
  AppelDeFondsInputSchema,
} from './service';
import { PrestationInputSchema, MaintenanceInputSchema } from './types';
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
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        let provider = null;
        let logoUrl: string | undefined;

        if (input.providerId) {
          provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
          });
          if (!provider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
          }
          logoUrl = provider.logoUrl || undefined;
        }

        const documentData = {
          ...input,
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider?.name || '',
          provider_legal: provider?.legalName || '',
          provider_address: provider?.address || '',
          provider_city: provider?.city || '',
          provider_siret: provider?.siret || '',
          provider_email: provider?.email || '',
          provider_phone: provider?.phone || '',
          bank_name: provider?.bankName || '',
          iban: provider?.iban || '',
          bic: provider?.bic || '',
        };

        const pdfBuffer = await generateDocument(documentData, logoUrl);

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
            clientName: documentData.client_name,
            clientSiret: documentData.client_siret,
            clientAddress: documentData.client_address,
            clientCity: documentData.client_city,
            clientCountry: documentData.client_country,
            providerId: input.providerId || null,
            providerName: documentData.provider_name,
            providerLegal: documentData.provider_legal,
            providerSiret: documentData.provider_siret,
            providerAddress: documentData.provider_address,
            providerCity: documentData.provider_city,
            providerEmail: documentData.provider_email,
            providerPhone: documentData.provider_phone,
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
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        let provider = null;
        let logoUrl: string | undefined;

        if (input.providerId) {
          provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
          });
          if (!provider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
          }
          logoUrl = provider.logoUrl || undefined;
        }

        const documentData = {
          ...input,
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider?.name || '',
          provider_legal: provider?.legalName || '',
          provider_address: provider?.address || '',
          provider_city: provider?.city || '',
          provider_siret: provider?.siret || '',
          provider_email: provider?.email || '',
          provider_phone: provider?.phone || '',
          bank_name: provider?.bankName || '',
          iban: provider?.iban || '',
          bic: provider?.bic || '',
        };

        const pdfBuffer = await generateDocument(documentData, logoUrl);
        return {
          pdf: pdfBuffer.toString('base64'),
          typstContent: generateTypstContent(documentData)
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
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        let provider = null;
        let logoUrl: string | undefined;

        if (input.providerId) {
          provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
          });
          if (!provider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
          }
          logoUrl = provider.logoUrl || undefined;
        }

        const documentData = {
          ...input,
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider?.name || '',
          provider_legal: provider?.legalName || '',
          provider_address: provider?.address || '',
          provider_city: provider?.city || '',
          provider_siret: provider?.siret || '',
          provider_email: provider?.email || '',
          provider_phone: provider?.phone || '',
          bank_name: provider?.bankName || '',
          iban: provider?.iban || '',
          bic: provider?.bic || '',
        };

        const pdfBuffer = await generateDocument(documentData, logoUrl);

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

  previewPrestation: adminProcedure
    .input(PrestationInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        const provider = await ctx.db.provider.findUnique({
          where: { id: input.providerId },
        });
        if (!provider) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }

        const documentData = {
          type: 'prestation' as const,
          invoice_number: input.invoice_number,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          clientId: input.clientId,
          providerId: input.providerId,
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider.name,
          provider_legal: provider.legalName || '',
          provider_address: provider.address || '',
          provider_city: provider.city || '',
          provider_siret: provider.siret || '',
          provider_email: provider.email || '',
          provider_phone: provider.phone || '',
          bank_name: provider.bankName || '',
          iban: provider.iban || '',
          bic: provider.bic || '',
          items: input.items,
          tva_rate: input.tva_rate,
          railway_estimate: input.railway_estimate,
        };

        const pdfBuffer = await generateDocument(documentData, provider.logoUrl || undefined);
        const fileName = `prestation_${input.invoice_number}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate prestation preview',
        });
      }
    }),

  createPrestation: adminProcedure
    .input(PrestationInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        const provider = await ctx.db.provider.findUnique({
          where: { id: input.providerId },
        });
        if (!provider) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }

        const documentData = {
          type: 'prestation' as const,
          invoice_number: input.invoice_number,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          clientId: input.clientId,
          providerId: input.providerId,
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider.name,
          provider_legal: provider.legalName || '',
          provider_address: provider.address || '',
          provider_city: provider.city || '',
          provider_siret: provider.siret || '',
          provider_email: provider.email || '',
          provider_phone: provider.phone || '',
          bank_name: provider.bankName || '',
          iban: provider.iban || '',
          bic: provider.bic || '',
          items: input.items,
          tva_rate: input.tva_rate,
          railway_estimate: input.railway_estimate,
        };

        const pdfBuffer = await generateDocument(documentData, provider.logoUrl || undefined);
        const fileName = `prestation_${input.invoice_number}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const totalWithRailway = subtotal + (input.railway_estimate || 0);
        const tva = totalWithRailway * (input.tva_rate / 100);
        const total = totalWithRailway + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation',
            name: fileName,
            invoiceNumber: input.invoice_number,
            clientName: documentData.client_name,
            clientSiret: documentData.client_siret,
            clientAddress: documentData.client_address,
            clientCity: documentData.client_city,
            clientCountry: documentData.client_country,
            providerId: input.providerId,
            providerName: documentData.provider_name,
            providerLegal: documentData.provider_legal,
            providerSiret: documentData.provider_siret,
            providerAddress: documentData.provider_address,
            providerCity: documentData.provider_city,
            providerEmail: documentData.provider_email,
            providerPhone: documentData.provider_phone,
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
          message: error.message || 'Failed to create prestation',
        });
      }
    }),

  previewMaintenance: adminProcedure
    .input(MaintenanceInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        const provider = await ctx.db.provider.findUnique({
          where: { id: input.providerId },
        });
        if (!provider) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }

        const documentData = {
          type: 'maintenance' as const,
          quote_number: input.quote_number,
          quote_date: input.quote_date,
          validity_date: input.validity_date,
          maintenance_period: input.maintenance_period,
          clientId: input.clientId,
          providerId: input.providerId,
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider.name,
          provider_legal: provider.legalName || '',
          provider_address: provider.address || '',
          provider_city: provider.city || '',
          provider_siret: provider.siret || '',
          provider_email: provider.email || '',
          provider_phone: provider.phone || '',
          bank_name: provider.bankName || '',
          iban: provider.iban || '',
          bic: provider.bic || '',
          items: input.items,
          tva_rate: input.tva_rate,
          railway_estimate: input.railway_estimate,
        };

        const pdfBuffer = await generateDocument(documentData, provider.logoUrl || undefined);
        const fileName = `maintenance_${input.quote_number}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate maintenance preview',
        });
      }
    }),

  createMaintenance: adminProcedure
    .input(MaintenanceInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        const provider = await ctx.db.provider.findUnique({
          where: { id: input.providerId },
        });
        if (!provider) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }

        const documentData = {
          type: 'maintenance' as const,
          quote_number: input.quote_number,
          quote_date: input.quote_date,
          validity_date: input.validity_date,
          maintenance_period: input.maintenance_period,
          clientId: input.clientId,
          providerId: input.providerId,
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider.name,
          provider_legal: provider.legalName || '',
          provider_address: provider.address || '',
          provider_city: provider.city || '',
          provider_siret: provider.siret || '',
          provider_email: provider.email || '',
          provider_phone: provider.phone || '',
          bank_name: provider.bankName || '',
          iban: provider.iban || '',
          bic: provider.bic || '',
          items: input.items,
          tva_rate: input.tva_rate,
          railway_estimate: input.railway_estimate,
        };

        const pdfBuffer = await generateDocument(documentData, provider.logoUrl || undefined);
        const fileName = `maintenance_${input.quote_number}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const totalWithRailway = subtotal + (input.railway_estimate || 0);
        const tva = totalWithRailway * (input.tva_rate / 100);
        const total = totalWithRailway + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'maintenance',
            name: fileName,
            quoteNumber: input.quote_number,
            clientName: documentData.client_name,
            clientSiret: documentData.client_siret,
            clientAddress: documentData.client_address,
            clientCity: documentData.client_city,
            clientCountry: documentData.client_country,
            providerId: input.providerId,
            providerName: documentData.provider_name,
            providerLegal: documentData.provider_legal,
            providerSiret: documentData.provider_siret,
            providerAddress: documentData.provider_address,
            providerCity: documentData.provider_city,
            providerEmail: documentData.provider_email,
            providerPhone: documentData.provider_phone,
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
          message: error.message || 'Failed to create maintenance',
        });
      }
    }),

  previewBackContractuel: adminProcedure
    .input(BackContractuelInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        let provider = null;
        let logoUrl: string | undefined;

        if (input.providerId) {
          provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
          });
          if (!provider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
          }
          logoUrl = provider.logoUrl || undefined;
        }

        const documentData = {
          type: 'back_contractuel' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          project_name: input.project_name,
          valid_until: input.valid_until,
          clientId: input.clientId,
          providerId: input.providerId,
          providers: input.providers,
          features: input.features,
          items: input.items,
          tva_rate: input.tva_rate,
          railway_estimate: 0,
          payment_providers: [],
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider?.name || '',
          provider_legal: provider?.legalName || '',
          provider_address: provider?.address || '',
          provider_city: provider?.city || '',
          provider_siret: provider?.siret || '',
          provider_email: provider?.email || '',
          provider_phone: provider?.phone || '',
          bank_name: provider?.bankName || '',
          iban: provider?.iban || '',
          bic: provider?.bic || '',
        };

        const pdfBuffer = await generateDocument(documentData, logoUrl);
        return {
          pdf: pdfBuffer.toString('base64'),
          typstContent: generateTypstContent(documentData)
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate preview',
        });
      }
    }),

  createBackContractuel: adminProcedure
    .input(BackContractuelInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        let provider = null;
        let logoUrl: string | undefined;

        if (input.providerId) {
          provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
          });
          if (!provider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
          }
          logoUrl = provider.logoUrl || undefined;
        }

        const documentData = {
          type: 'back_contractuel' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          project_name: input.project_name,
          valid_until: input.valid_until,
          clientId: input.clientId,
          providerId: input.providerId,
          providers: input.providers,
          features: input.features,
          items: input.items,
          tva_rate: input.tva_rate,
          railway_estimate: 0,
          payment_providers: [],
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider?.name || '',
          provider_legal: provider?.legalName || '',
          provider_address: provider?.address || '',
          provider_city: provider?.city || '',
          provider_siret: provider?.siret || '',
          provider_email: provider?.email || '',
          provider_phone: provider?.phone || '',
          bank_name: provider?.bankName || '',
          iban: provider?.iban || '',
          bic: provider?.bic || '',
        };

        const pdfBuffer = await generateDocument(documentData, logoUrl);
        const fileName = `back_contractuel_${input.contract_reference}.pdf`;

        const subtotal = input.items.reduce(
          (sum: number, item: any) => sum + item.quantity * item.price,
          0
        );
        const tva = subtotal * (input.tva_rate / 100);
        const total = subtotal + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'back_contractuel',
            name: fileName,
            contractRef: input.contract_reference,
            clientName: documentData.client_name,
            clientSiret: documentData.client_siret,
            clientAddress: documentData.client_address,
            clientCity: documentData.client_city,
            clientCountry: documentData.client_country,
            providerId: input.providerId || null,
            providerName: documentData.provider_name,
            providerLegal: documentData.provider_legal,
            providerSiret: documentData.provider_siret,
            providerAddress: documentData.provider_address,
            providerCity: documentData.provider_city,
            providerEmail: documentData.provider_email,
            providerPhone: documentData.provider_phone,
            items: input.items,
            subtotal,
            tva,
            total,
            tvaRate: input.tva_rate,
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

  previewAppelDeFonds: adminProcedure
    .input(AppelDeFondsInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        let provider = null;
        let logoUrl: string | undefined;

        if (input.providerId) {
          provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
          });
          if (!provider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
          }
          logoUrl = provider.logoUrl || undefined;
        }

        const documentData = {
          type: 'appel_de_fonds' as const,
          global_invoice_ref: input.global_invoice_ref,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_step: input.project_step,
          project_name: input.project_name,
          clientId: input.clientId,
          providerId: input.providerId,
          payment_providers: input.payment_providers,
          tva_rate: input.tva_rate,
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider?.name || '',
          provider_legal: provider?.legalName || '',
          provider_address: provider?.address || '',
          provider_city: provider?.city || '',
          provider_siret: provider?.siret || '',
          provider_email: provider?.email || '',
          provider_phone: provider?.phone || '',
          bank_name: provider?.bankName || '',
          iban: provider?.iban || '',
          bic: provider?.bic || '',
        };

        const pdfBuffer = await generateDocument(documentData, logoUrl);
        return {
          pdf: pdfBuffer.toString('base64'),
          typstContent: generateTypstContent(documentData)
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate preview',
        });
      }
    }),

  createAppelDeFonds: adminProcedure
    .input(AppelDeFondsInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
        });
        if (!client) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
        }

        let provider = null;
        let logoUrl: string | undefined;

        if (input.providerId) {
          provider = await ctx.db.provider.findUnique({
            where: { id: input.providerId },
          });
          if (!provider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
          }
          logoUrl = provider.logoUrl || undefined;
        }

        const documentData = {
          type: 'appel_de_fonds' as const,
          global_invoice_ref: input.global_invoice_ref,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_step: input.project_step,
          project_name: input.project_name,
          clientId: input.clientId,
          providerId: input.providerId,
          payment_providers: input.payment_providers,
          tva_rate: input.tva_rate,
          client_name: client.companyName,
          client_address: client.billingAddress || '',
          client_city: client.billingCity || '',
          client_country: client.billingCountry || '',
          client_siret: client.siret || '',
          provider_name: provider?.name || '',
          provider_legal: provider?.legalName || '',
          provider_address: provider?.address || '',
          provider_city: provider?.city || '',
          provider_siret: provider?.siret || '',
          provider_email: provider?.email || '',
          provider_phone: provider?.phone || '',
          bank_name: provider?.bankName || '',
          iban: provider?.iban || '',
          bic: provider?.bic || '',
        };

        const pdfBuffer = await generateDocument(documentData, logoUrl);
        const fileName = `appel_de_fonds_${input.global_invoice_ref}.pdf`;

        const subtotal = input.payment_providers.reduce(
          (sum: number, provider: any) => sum + provider.amount_to_pay,
          0
        );
        const tva = subtotal * (input.tva_rate / 100);
        const total = subtotal + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'appel_de_fonds',
            name: fileName,
            invoiceNumber: input.global_invoice_ref,
            clientName: documentData.client_name,
            clientSiret: documentData.client_siret,
            clientAddress: documentData.client_address,
            clientCity: documentData.client_city,
            clientCountry: documentData.client_country,
            providerId: input.providerId || null,
            providerName: documentData.provider_name,
            providerLegal: documentData.provider_legal,
            providerSiret: documentData.provider_siret,
            providerAddress: documentData.provider_address,
            providerCity: documentData.provider_city,
            providerEmail: documentData.provider_email,
            providerPhone: documentData.provider_phone,
            items: [],
            subtotal,
            tva,
            total,
            tvaRate: input.tva_rate,
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
});
