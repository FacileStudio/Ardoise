import { router, adminProcedure } from '../../trpc';
import {
  generateDocument,
  generateTypstContent,
  buildPartyAndLegalData,
  buildDocumentLegalPersistence,
  buildDocumentPersistenceBase,
  loadDocumentContext,
  computeInvoiceTotals,
  ContratPrestationInputSchema,
  ContratMaintenanceInputSchema,
  BackContractuelInputSchema,
  AppelDeFondsInputSchema,
  type DocType,
  type DocumentData,
} from './service';
import { PrestationInputSchema, MaintenanceInputSchema } from './types';
import {
  PrestationDesignInputSchema,
  PrestationDevInputSchema,
  PrestationFormationInputSchema,
  PrestationBtpInputSchema,
  PrestationBarmanInputSchema,
  PrestationPhotoInputSchema,
  PrestationVideoInputSchema,
} from './services/schemas';
import { generateNextDocumentNumber, previewDocumentNumber } from './numbering';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { StorageService } from '@repo/storage';
import { cleanupTempFile, downloadStoredFileToTempPath } from '../settings/service';
import { logger } from '@repo/logger';

async function downloadLogoFromS3(logoUrl: string | null | undefined, storage: StorageService): Promise<string | undefined> {
  if (!logoUrl || (!logoUrl.includes('storageapi.dev') && !logoUrl.includes('/storage/'))) {
    return undefined;
  }

  try {
    return await downloadStoredFileToTempPath(logoUrl, storage, 'logo');
  } catch (error) {
    logger.error({ err: error }, 'Failed to download logo from S3');
    return undefined;
  }
}

async function generateDocumentWithLogo(
  documentData: any,
  logoUrl: string | null | undefined,
  storage: StorageService
): Promise<Buffer> {
  const logoPath = await downloadLogoFromS3(logoUrl, storage);

  try {
    return await generateDocument(documentData, logoPath);
  } finally {
    cleanupTempFile(logoPath);
  }
}

async function fetchProvidersByIds(db: any, ids: string[]) {
  const providers = await db.provider.findMany({ where: { id: { in: ids } } });
  if (providers.length !== ids.length) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'One or more providers not found' });
  }
  return providers as Array<{ id: string; name: string; address: string | null; city: string | null; siret: string | null; email: string | null; iban: string | null; bic: string | null }>;
}

async function resolveSubProvidersForBack(
  db: any,
  inputs: Array<{ id: string; role: string; amount: number }>
) {
  const providers = await fetchProvidersByIds(db, inputs.map(p => p.id));
  return inputs.map(inputProvider => {
    const dbProvider = providers.find(p => p.id === inputProvider.id)!;
    return {
      name: dbProvider.name,
      role: inputProvider.role,
      address: dbProvider.address || '',
      city: dbProvider.city || '',
      siret: dbProvider.siret || '',
      email: dbProvider.email || '',
      amount: inputProvider.amount,
    };
  });
}

type SpecializedInput = {
  clientId: string;
  providerId: string;
  items: Array<{ description?: string; quantity?: number; unit?: string; price?: number }>;
  invoice_date: string;
  due_date: string;
};

async function previewSpecializedPrestation(
  type: any,
  fileNamePrefix: string,
  input: SpecializedInput,
  typeSpecificData: Record<string, unknown>,
  ctx: any
) {
  const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');
  const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

  const documentData = {
    type,
    invoice_number: invoiceNumber,
    invoice_date: input.invoice_date,
    due_date: input.due_date,
    clientId: input.clientId,
    providerId: input.providerId,
    ...buildPartyAndLegalData(client, provider, settings),
    items: input.items,
    tva_rate: tvaRate,
    railway_estimate: 0,
    providers: [],
    features: [],
    payment_providers: [],
    ...typeSpecificData,
  };

  const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
  return {
    pdf: pdfBuffer.toString('base64'),
    fileName: `${fileNamePrefix}_${invoiceNumber}.pdf`,
    typstContent: generateTypstContent(documentData),
  };
}

async function createSpecializedPrestation(
  type: any,
  fileNamePrefix: string,
  input: SpecializedInput,
  typeSpecificData: Record<string, unknown>,
  ctx: any
) {
  const invoiceNumber = await generateNextDocumentNumber(ctx.db, 'invoice');
  const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

  const documentData = {
    type,
    invoice_number: invoiceNumber,
    invoice_date: input.invoice_date,
    due_date: input.due_date,
    clientId: input.clientId,
    providerId: input.providerId,
    ...buildPartyAndLegalData(client, provider, settings),
    items: input.items,
    tva_rate: tvaRate,
    railway_estimate: 0,
    providers: [],
    features: [],
    payment_providers: [],
    ...typeSpecificData,
  };

  const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
  const fileName = `${fileNamePrefix}_${invoiceNumber}.pdf`;
  const { subtotal, tva, total } = computeInvoiceTotals(input.items, tvaRate);
  const legalPersistence = buildDocumentLegalPersistence(client, provider, settings);

  const document = await ctx.db.document.create({
    data: {
      type,
      name: fileName,
      invoiceNumber,
      ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence),
      items: input.items,
      subtotal,
      tva,
      total,
      tvaRate,
      serviceData: typeSpecificData as Record<string, unknown>,
    },
  });

  return {
    document,
    pdf: pdfBuffer.toString('base64'),
    fileName,
  };
}

async function resolveSubProvidersForAppel(
  db: any,
  inputs: Array<{ id: string; amount_to_pay: number }>
) {
  const providers = await fetchProvidersByIds(db, inputs.map(p => p.id));
  return inputs.map(inputProvider => {
    const dbProvider = providers.find(p => p.id === inputProvider.id)!;
    return {
      name: dbProvider.name,
      iban: dbProvider.iban || '',
      bic: dbProvider.bic || '',
      amount_to_pay: inputProvider.amount_to_pay,
    };
  });
}

export const documentRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        type: z.string().optional(),
        spaceId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize, search, type, spaceId } = input;
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (spaceId !== undefined) {
        where.spaceId = spaceId || null;
      }
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
        let bankName = '';
        let iban = '';
        let bic = '';
        if (document.providerId) {
          const provider = await ctx.db.provider.findUnique({
            where: { id: document.providerId },
            select: { logoUrl: true, bankName: true, iban: true, bic: true },
          });
          logoUrl = provider?.logoUrl || undefined;
          bankName = provider?.bankName || '';
          iban = provider?.iban || '';
          bic = provider?.bic || '';
        }

        const documentData = {
          type: document.type as DocType,
          invoice_number: document.invoiceNumber || '',
          quote_number: document.quoteNumber || '',
          contract_reference: document.contractRef || '',
          clientId: '',
          providerId: document.providerId || undefined,
          client_name: document.clientName,
          client_siret: document.clientSiret || '',
          client_address: document.clientAddress || '',
          client_city: document.clientCity || '',
          client_postal_code: document.clientPostalCode || '',
          client_country: document.clientCountry || '',
          client_tva_intracom: document.clientTvaIntracom || '',
          provider_name: document.providerName,
          provider_legal: document.providerLegal || '',
          provider_legal_form: document.providerLegalForm || '',
          provider_share_capital: document.providerShareCapital != null ? Number(document.providerShareCapital) : '',
          provider_rcs_city: document.providerRcsCity || '',
          provider_ape_code: document.providerApeCode || '',
          provider_tva_intracom: document.providerTvaIntracom || '',
          provider_siret: document.providerSiret || '',
          provider_address: document.providerAddress || '',
          provider_city: document.providerCity || '',
          provider_postal_code: document.providerPostalCode || '',
          provider_email: document.providerEmail || '',
          provider_phone: document.providerPhone || '',
          bank_name: bankName,
          iban,
          bic,
          items: document.items as DocumentData['items'],
          tva_rate: Number(document.tvaRate || 20),
          payment_terms_days: document.paymentTermsDays ?? 30,
          late_fee_rate: document.lateFeeRate || "3 fois le taux d'intérêt légal en vigueur",
          recovery_fee_amount: document.recoveryFeeAmount != null ? Number(document.recoveryFeeAmount) : 40,
          vat_exemption_mention: document.vatExemptionMention || '',
          delivery_date: document.deliveryDate ? document.deliveryDate.toISOString().split('T')[0] : '',
          railway_estimate: Number(document.railwayEstimate || 0),
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, logoUrl, ctx.storage);

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName: document.name,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to download document',
        });
      }
    }),

  previewPrestation: adminProcedure
    .input(PrestationInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

        const documentData = {
          type: 'prestation' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          items: input.items,
          tva_rate: tvaRate,
          railway_estimate: input.railway_estimate,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_${invoiceNumber}.pdf`;

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
        const invoiceNumber = await generateNextDocumentNumber(ctx.db, 'invoice');
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

        const documentData = {
          type: 'prestation' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          items: input.items,
          tva_rate: tvaRate,
          railway_estimate: input.railway_estimate,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_${invoiceNumber}.pdf`;
        const { subtotal, tva, total } = computeInvoiceTotals(input.items, tvaRate, input.railway_estimate);
        const legalPersistence = buildDocumentLegalPersistence(client, provider, settings);

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation',
            name: fileName,
            invoiceNumber,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence),
            items: input.items,
            subtotal,
            tva,
            total,
            tvaRate,
            railwayEstimate: input.railway_estimate,
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
        const quoteNumber = await previewDocumentNumber(ctx.db, 'quote');
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

        const documentData = {
          type: 'maintenance' as const,
          quote_number: quoteNumber,
          quote_date: input.quote_date,
          validity_date: input.validity_date,
          maintenance_period: input.maintenance_period,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          items: input.items,
          tva_rate: tvaRate,
          railway_estimate: input.railway_estimate,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `maintenance_${quoteNumber}.pdf`;

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
        const quoteNumber = await generateNextDocumentNumber(ctx.db, 'quote');
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

        const documentData = {
          type: 'maintenance' as const,
          quote_number: quoteNumber,
          quote_date: input.quote_date,
          validity_date: input.validity_date,
          maintenance_period: input.maintenance_period,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          items: input.items,
          tva_rate: tvaRate,
          railway_estimate: input.railway_estimate,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `maintenance_${quoteNumber}.pdf`;
        const { subtotal, tva, total } = computeInvoiceTotals(input.items, tvaRate, input.railway_estimate);
        const legalPersistence = buildDocumentLegalPersistence(client, provider, settings);

        const document = await ctx.db.document.create({
          data: {
            type: 'maintenance',
            name: fileName,
            quoteNumber,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence),
            items: input.items,
            subtotal,
            tva,
            total,
            tvaRate,
            railwayEstimate: input.railway_estimate,
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
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);
        const providersWithDetails = await resolveSubProvidersForBack(ctx.db, input.providers);

        const documentData = {
          type: 'back_contractuel' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          project_name: input.project_name,
          valid_until: input.valid_until,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          providers: providersWithDetails,
          features: input.features,
          items: input.items,
          tva_rate: tvaRate,
          railway_estimate: 0,
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        return {
          pdf: pdfBuffer.toString('base64'),
          typstContent: generateTypstContent(documentData),
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
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);
        const providersWithDetails = await resolveSubProvidersForBack(ctx.db, input.providers);

        const documentData = {
          type: 'back_contractuel' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          project_name: input.project_name,
          valid_until: input.valid_until,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          providers: providersWithDetails,
          features: input.features,
          items: input.items,
          tva_rate: tvaRate,
          railway_estimate: 0,
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `back_contractuel_${input.contract_reference}.pdf`;
        const { subtotal, tva, total } = computeInvoiceTotals(input.items || [], tvaRate);
        const legalPersistence = buildDocumentLegalPersistence(client, provider, settings);

        const document = await ctx.db.document.create({
          data: {
            type: 'back_contractuel',
            name: fileName,
            contractRef: input.contract_reference,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence),
            items: input.items || [],
            subtotal,
            tva,
            total,
            tvaRate,
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
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);
        const paymentProvidersWithDetails = await resolveSubProvidersForAppel(ctx.db, input.payment_providers);

        const documentData = {
          type: 'appel_de_fonds' as const,
          global_invoice_ref: input.global_invoice_ref,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_step: input.project_step,
          project_name: input.project_name,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          payment_providers: paymentProvidersWithDetails,
          tva_rate: tvaRate,
          items: input.items || [],
          railway_estimate: 0,
          providers: [],
          features: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        return {
          pdf: pdfBuffer.toString('base64'),
          typstContent: generateTypstContent(documentData),
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
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);
        const paymentProvidersWithDetails = await resolveSubProvidersForAppel(ctx.db, input.payment_providers);

        const documentData = {
          type: 'appel_de_fonds' as const,
          global_invoice_ref: input.global_invoice_ref,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_step: input.project_step,
          project_name: input.project_name,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          payment_providers: paymentProvidersWithDetails,
          tva_rate: tvaRate,
          items: input.items || [],
          railway_estimate: 0,
          providers: [],
          features: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `appel_de_fonds_${input.global_invoice_ref}.pdf`;

        const subtotal = input.payment_providers.reduce((sum, p) => sum + p.amount_to_pay, 0);
        const tva = subtotal * (tvaRate / 100);
        const total = subtotal + tva;
        const legalPersistence = buildDocumentLegalPersistence(client, provider, settings);

        const document = await ctx.db.document.create({
          data: {
            type: 'appel_de_fonds',
            name: fileName,
            invoiceNumber: input.global_invoice_ref,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence),
            items: input.items || [],
            subtotal,
            tva,
            total,
            tvaRate,
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

  previewContratPrestation: adminProcedure
    .input(ContratPrestationInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

        const documentData = {
          type: 'contrat_prestation' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          quote_number: input.quote_number,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          items: [],
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        return {
          pdf: pdfBuffer.toString('base64'),
          fileName: `contrat_prestation_${input.contract_reference}.pdf`,
          typstContent: generateTypstContent(documentData),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to preview contract',
        });
      }
    }),

  createContratPrestation: adminProcedure
    .input(ContratPrestationInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

        const documentData = {
          type: 'contrat_prestation' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          quote_number: input.quote_number,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          items: [],
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `contrat_prestation_${input.contract_reference}.pdf`;
        const legalPersistence = buildDocumentLegalPersistence(client, provider, settings);

        const document = await ctx.db.document.create({
          data: {
            type: 'contrat_prestation',
            name: fileName,
            contractRef: input.contract_reference,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence),
            items: [],
            subtotal: 0,
            tva: 0,
            total: 0,
            tvaRate,
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
          message: error.message || 'Failed to create contract',
        });
      }
    }),

  previewContratMaintenance: adminProcedure
    .input(ContratMaintenanceInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

        const documentData = {
          type: 'contrat_maintenance' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          maintenance_period: input.maintenance_period,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          items: [],
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        return {
          pdf: pdfBuffer.toString('base64'),
          fileName: `contrat_maintenance_${input.contract_reference}.pdf`,
          typstContent: generateTypstContent(documentData),
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to preview contract',
        });
      }
    }),

  createContratMaintenance: adminProcedure
    .input(ContratMaintenanceInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, input.clientId, input.providerId);

        const documentData = {
          type: 'contrat_maintenance' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          maintenance_period: input.maintenance_period,
          clientId: input.clientId,
          providerId: input.providerId,
          ...buildPartyAndLegalData(client, provider, settings),
          items: [],
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `contrat_maintenance_${input.contract_reference}.pdf`;
        const legalPersistence = buildDocumentLegalPersistence(client, provider, settings);

        const document = await ctx.db.document.create({
          data: {
            type: 'contrat_maintenance',
            name: fileName,
            contractRef: input.contract_reference,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence),
            items: [],
            subtotal: 0,
            tva: 0,
            total: 0,
            tvaRate,
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
          message: error.message || 'Failed to create contract',
        });
      }
    }),

  previewPrestationBarman: adminProcedure
    .input(PrestationBarmanInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_barman',
          'prestation_barman',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate prestation barman preview',
        });
      }
    }),

  createPrestationBarman: adminProcedure
    .input(PrestationBarmanInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_barman',
          'prestation_barman',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create prestation barman',
        });
      }
    }),

  previewPrestationPhoto: adminProcedure
    .input(PrestationPhotoInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_photo',
          'prestation_photo',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate prestation photo preview',
        });
      }
    }),

  createPrestationPhoto: adminProcedure
    .input(PrestationPhotoInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_photo',
          'prestation_photo',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create prestation photo',
        });
      }
    }),

  previewPrestationVideo: adminProcedure
    .input(PrestationVideoInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_video',
          'prestation_video',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate prestation video preview',
        });
      }
    }),

  createPrestationVideo: adminProcedure
    .input(PrestationVideoInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_video',
          'prestation_video',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create prestation video',
        });
      }
    }),

  previewPrestationDesign: adminProcedure
    .input(PrestationDesignInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_design',
          'prestation_design',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate preview',
        });
      }
    }),

  createPrestationDesign: adminProcedure
    .input(PrestationDesignInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_design',
          'prestation_design',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create document',
        });
      }
    }),

  previewPrestationDev: adminProcedure
    .input(PrestationDevInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_dev',
          'prestation_dev',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate preview',
        });
      }
    }),

  createPrestationDev: adminProcedure
    .input(PrestationDevInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_dev',
          'prestation_dev',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create document',
        });
      }
    }),

  previewPrestationFormation: adminProcedure
    .input(PrestationFormationInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_formation',
          'prestation_formation',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate preview',
        });
      }
    }),

  createPrestationFormation: adminProcedure
    .input(PrestationFormationInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_formation',
          'prestation_formation',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create document',
        });
      }
    }),

  previewPrestationBtp: adminProcedure
    .input(PrestationBtpInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_btp',
          'prestation_btp',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate preview',
        });
      }
    }),

  createPrestationBtp: adminProcedure
    .input(PrestationBtpInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_btp',
          'prestation_btp',
          { invoice_date, due_date, clientId, providerId, items },
          typeSpecific,
          ctx
        );
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create document',
        });
      }
    }),
});
