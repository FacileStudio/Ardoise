import { router, adminProcedure } from '../../trpc';
import {
  generateDocument,
  generateTypstContent,
  ContratPrestationInputSchema,
  ContratMaintenanceInputSchema,
  BackContractuelInputSchema,
  AppelDeFondsInputSchema,
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
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { StorageService } from '@repo/storage';

async function downloadLogoFromS3(logoUrl: string | null | undefined, storage: StorageService): Promise<string | undefined> {
  if (!logoUrl || !logoUrl.includes('storageapi.dev')) {
    return undefined;
  }

  try {
    const urlPath = new URL(logoUrl).pathname;
    const pathParts = urlPath.split('/').filter(Boolean);
    const uploadsIndex = pathParts.indexOf('uploads');

    if (uploadsIndex === -1) {
      return undefined;
    }

    const filePath = pathParts.slice(uploadsIndex).join('/');
    const fileData = await storage.download(filePath);

    const tempDir = mkdtempSync(join(tmpdir(), 'logo-'));
    const extension = logoUrl.split('.').pop() || 'png';
    const localPath = join(tempDir, `logo.${extension}`);

    writeFileSync(localPath, Buffer.from(fileData));

    return localPath;
  } catch (error) {
    console.error('Failed to download logo from S3:', error);
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
    if (logoPath) {
      try {
        const tempDir = logoPath.substring(0, logoPath.lastIndexOf('/'));
        rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }
}

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
          clientId: '',
          providerId: document.providerId || undefined,
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
          bank_name: '',
          iban: '',
          bic: '',
          items: document.items as any[],
          tva_rate: Number(document.tvaRate || 20),
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
        const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation' as const,
          invoice_number: invoiceNumber,
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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation' as const,
          invoice_number: invoiceNumber,
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
          tva_rate: tvaRate,
          railway_estimate: input.railway_estimate,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_${invoiceNumber}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const totalWithRailway = subtotal + (input.railway_estimate || 0);
        const tva = totalWithRailway * (tvaRate / 100);
        const total = totalWithRailway + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation',
            name: fileName,
            invoiceNumber: invoiceNumber,
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
            tvaRate: tvaRate,
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
        const quoteNumber = await previewDocumentNumber(ctx.db, 'quote');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'maintenance' as const,
          quote_number: quoteNumber,
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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'maintenance' as const,
          quote_number: quoteNumber,
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
          tva_rate: tvaRate,
          providers: [],
          features: [],
          payment_providers: [],
          railway_estimate: input.railway_estimate,
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `maintenance_${quoteNumber}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const totalWithRailway = subtotal + (input.railway_estimate || 0);
        const tva = totalWithRailway * (tvaRate / 100);
        const total = totalWithRailway + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'maintenance',
            name: fileName,
            quoteNumber: quoteNumber,
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
            tvaRate: tvaRate,
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

        const provider = await ctx.db.provider.findUnique({
          where: { id: input.providerId },
        });
        if (!provider) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }

        const subProviderIds = input.providers.map(p => p.id);
        const subProviders = await ctx.db.provider.findMany({
          where: { id: { in: subProviderIds } },
        });

        if (subProviders.length !== subProviderIds.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'One or more sub-providers not found' });
        }

        const providersWithDetails = input.providers.map(inputProvider => {
          const dbProvider = subProviders.find(p => p.id === inputProvider.id);
          if (!dbProvider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `Provider ${inputProvider.id} not found` });
          }
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

        const tvaRate = Number(provider.tvaRate || 20);
        const logoUrl = provider.logoUrl || undefined;

        const documentData = {
          type: 'back_contractuel' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          project_name: input.project_name,
          valid_until: input.valid_until,
          clientId: input.clientId,
          providerId: input.providerId,
          providers: providersWithDetails,
          features: input.features,
          items: input.items,
          tva_rate: tvaRate,
          railway_estimate: 0,
          payment_providers: [],
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
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, logoUrl, ctx.storage);
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

        const provider = await ctx.db.provider.findUnique({
          where: { id: input.providerId },
        });
        if (!provider) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }

        const subProviderIds = input.providers.map(p => p.id);
        const subProviders = await ctx.db.provider.findMany({
          where: { id: { in: subProviderIds } },
        });

        if (subProviders.length !== subProviderIds.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'One or more sub-providers not found' });
        }

        const providersWithDetails = input.providers.map(inputProvider => {
          const dbProvider = subProviders.find(p => p.id === inputProvider.id);
          if (!dbProvider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `Provider ${inputProvider.id} not found` });
          }
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

        const tvaRate = Number(provider.tvaRate || 20);
        const logoUrl = provider.logoUrl || undefined;

        const documentData = {
          type: 'back_contractuel' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          project_name: input.project_name,
          valid_until: input.valid_until,
          clientId: input.clientId,
          providerId: input.providerId,
          providers: providersWithDetails,
          features: input.features,
          items: input.items,
          tva_rate: tvaRate,
          railway_estimate: 0,
          payment_providers: [],
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
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, logoUrl, ctx.storage);
        const fileName = `back_contractuel_${input.contract_reference}.pdf`;

        const subtotal = (input.items || []).reduce(
          (sum: number, item: any) => sum + item.quantity * item.price,
          0
        );
        const tva = subtotal * (tvaRate / 100);
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
            items: input.items || [],
            subtotal,
            tva,
            total,
            tvaRate: tvaRate,
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

        const provider = await ctx.db.provider.findUnique({
          where: { id: input.providerId },
        });
        if (!provider) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }

        const paymentProviderIds = input.payment_providers.map(p => p.id);
        const paymentProviders = await ctx.db.provider.findMany({
          where: { id: { in: paymentProviderIds } },
        });

        if (paymentProviders.length !== paymentProviderIds.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'One or more payment providers not found' });
        }

        const paymentProvidersWithDetails = input.payment_providers.map(inputProvider => {
          const dbProvider = paymentProviders.find(p => p.id === inputProvider.id);
          if (!dbProvider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `Payment provider ${inputProvider.id} not found` });
          }
          return {
            name: dbProvider.name,
            iban: dbProvider.iban || '',
            bic: dbProvider.bic || '',
            amount_to_pay: inputProvider.amount_to_pay,
          };
        });

        const tvaRate = Number(provider.tvaRate || 20);
        const logoUrl = provider.logoUrl || undefined;

        const documentData = {
          type: 'appel_de_fonds' as const,
          global_invoice_ref: input.global_invoice_ref,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_step: input.project_step,
          project_name: input.project_name,
          clientId: input.clientId,
          providerId: input.providerId,
          payment_providers: paymentProvidersWithDetails,
          tva_rate: tvaRate,
          items: input.items || [],
          railway_estimate: 0,
          providers: [],
          features: [],
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
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, logoUrl, ctx.storage);
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

        const provider = await ctx.db.provider.findUnique({
          where: { id: input.providerId },
        });
        if (!provider) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
        }

        const paymentProviderIds = input.payment_providers.map(p => p.id);
        const paymentProviders = await ctx.db.provider.findMany({
          where: { id: { in: paymentProviderIds } },
        });

        if (paymentProviders.length !== paymentProviderIds.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'One or more payment providers not found' });
        }

        const paymentProvidersWithDetails = input.payment_providers.map(inputProvider => {
          const dbProvider = paymentProviders.find(p => p.id === inputProvider.id);
          if (!dbProvider) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `Payment provider ${inputProvider.id} not found` });
          }
          return {
            name: dbProvider.name,
            iban: dbProvider.iban || '',
            bic: dbProvider.bic || '',
            amount_to_pay: inputProvider.amount_to_pay,
          };
        });

        const tvaRate = Number(provider.tvaRate || 20);
        const logoUrl = provider.logoUrl || undefined;

        const documentData = {
          type: 'appel_de_fonds' as const,
          global_invoice_ref: input.global_invoice_ref,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_step: input.project_step,
          project_name: input.project_name,
          items: input.items || [],
          railway_estimate: 0,
          providers: [],
          features: [],
          clientId: input.clientId,
          providerId: input.providerId,
          payment_providers: paymentProvidersWithDetails,
          tva_rate: tvaRate,
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
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, logoUrl, ctx.storage);
        const fileName = `appel_de_fonds_${input.global_invoice_ref}.pdf`;

        const subtotal = input.payment_providers.reduce(
          (sum: number, provider: any) => sum + provider.amount_to_pay,
          0
        );
        const tva = subtotal * (tvaRate / 100);
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
            providerId: input.providerId,
            providerName: documentData.provider_name,
            providerLegal: documentData.provider_legal,
            providerSiret: documentData.provider_siret,
            providerAddress: documentData.provider_address,
            providerCity: documentData.provider_city,
            providerEmail: documentData.provider_email,
            providerPhone: documentData.provider_phone,
            items: input.items || [],
            subtotal,
            tva,
            total,
            tvaRate: tvaRate,
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

  previewContratPrestation: adminProcedure
    .input(ContratPrestationInputSchema)
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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'contrat_prestation' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          quote_number: input.quote_number,
          clientId: input.clientId,
          providerId: input.providerId,
          items: [],
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'contrat_prestation' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          quote_number: input.quote_number,
          clientId: input.clientId,
          providerId: input.providerId,
          items: [],
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
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
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `contrat_prestation_${input.contract_reference}.pdf`;

        const subtotal = 0;
        const tva = 0;
        const total = 0;

        const document = await ctx.db.document.create({
          data: {
            type: 'contrat_prestation',
            name: fileName,
            contractRef: input.contract_reference,
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
            items: [],
            subtotal,
            tva,
            total,
            tvaRate: tvaRate,
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
          message: error.message || 'Failed to create contract',
        });
      }
    }),

  previewContratMaintenance: adminProcedure
    .input(ContratMaintenanceInputSchema)
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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'contrat_maintenance' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          maintenance_period: input.maintenance_period,
          clientId: input.clientId,
          providerId: input.providerId,
          items: [],
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'contrat_maintenance' as const,
          contract_reference: input.contract_reference,
          contract_date: input.contract_date,
          maintenance_period: input.maintenance_period,
          clientId: input.clientId,
          providerId: input.providerId,
          items: [],
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
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
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `contrat_maintenance_${input.contract_reference}.pdf`;

        const subtotal = 0;
        const tva = 0;
        const total = 0;

        const document = await ctx.db.document.create({
          data: {
            type: 'contrat_maintenance',
            name: fileName,
            contractRef: input.contract_reference,
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
            items: [],
            subtotal,
            tva,
            total,
            tvaRate: tvaRate,
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
          message: error.message || 'Failed to create contract',
        });
      }
    }),

  previewPrestationBarman: adminProcedure
    .input(PrestationBarmanInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_barman' as const,
          invoice_number: invoiceNumber,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
          event_date: input.event_date,
          event_time: input.event_time,
          event_location: input.event_location,
          service_duration: input.service_duration,
          bar_setup_type: input.bar_setup_type,
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_barman_${invoiceNumber}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
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
        const invoiceNumber = await generateNextDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_barman' as const,
          invoice_number: invoiceNumber,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
          event_date: input.event_date,
          event_time: input.event_time,
          event_location: input.event_location,
          service_duration: input.service_duration,
          bar_setup_type: input.bar_setup_type,
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_barman_${invoiceNumber}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const tva = subtotal * (tvaRate / 100);
        const total = subtotal + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation_barman',
            name: fileName,
            invoiceNumber: invoiceNumber,
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
            tvaRate: tvaRate,
            fileSize: pdfBuffer.length,
            createdBy: ctx.user!.id,
            serviceData: {
              event_date: input.event_date,
              event_time: input.event_time,
              event_location: input.event_location,
              service_duration: input.service_duration,
              bar_setup_type: input.bar_setup_type,
            },
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
          message: error.message || 'Failed to create prestation barman',
        });
      }
    }),

  previewPrestationPhoto: adminProcedure
    .input(PrestationPhotoInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_photo' as const,
          invoice_number: invoiceNumber,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_photo_${invoiceNumber}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
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
        const invoiceNumber = await generateNextDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_photo' as const,
          invoice_number: invoiceNumber,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_photo_${invoiceNumber}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const tva = subtotal * (tvaRate / 100);
        const total = subtotal + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation_photo',
            name: fileName,
            invoiceNumber: invoiceNumber,
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
            tvaRate: tvaRate,
            fileSize: pdfBuffer.length,
            createdBy: ctx.user!.id,
            serviceData: {
              shoot_date: input.shoot_date,
              shoot_time: input.shoot_time,
              shoot_location: input.shoot_location,
              shoot_duration: input.shoot_duration,
              shoot_type: input.shoot_type,
            },
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
          message: error.message || 'Failed to create prestation photo',
        });
      }
    }),

  previewPrestationVideo: adminProcedure
    .input(PrestationVideoInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_video' as const,
          invoice_number: invoiceNumber,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_video_${invoiceNumber}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
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
        const invoiceNumber = await generateNextDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_video' as const,
          invoice_number: invoiceNumber,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_video_${invoiceNumber}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const tva = subtotal * (tvaRate / 100);
        const total = subtotal + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation_video',
            name: fileName,
            invoiceNumber: invoiceNumber,
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
            tvaRate: tvaRate,
            fileSize: pdfBuffer.length,
            createdBy: ctx.user!.id,
            serviceData: {
              shoot_date: input.shoot_date,
              shoot_time: input.shoot_time,
              shoot_location: input.shoot_location,
              shoot_duration: input.shoot_duration,
              video_type: input.video_type,
            },
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
          message: error.message || 'Failed to create prestation video',
        });
      }
    }),

  previewPrestationDesign: adminProcedure
    .input(PrestationDesignInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_design' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_name: input.project_name,
          project_type: input.project_type,
          delivery_date: input.delivery_date,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_design_${invoiceNumber}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
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
        const invoiceNumber = await generateNextDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_design' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_name: input.project_name,
          project_type: input.project_type,
          delivery_date: input.delivery_date,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_design_${invoiceNumber}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const tva = subtotal * (tvaRate / 100);
        const total = subtotal + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation_design',
            name: fileName,
            invoiceNumber: invoiceNumber,
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
            tvaRate: tvaRate,
            fileSize: pdfBuffer.length,
            createdBy: ctx.user!.id,
            serviceData: {
              project_name: input.project_name,
              project_type: input.project_type,
              delivery_date: input.delivery_date,
            },
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

  previewPrestationDev: adminProcedure
    .input(PrestationDevInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_dev' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_name: input.project_name,
          tech_stack: input.tech_stack,
          delivery_date: input.delivery_date,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_dev_${invoiceNumber}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
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
        const invoiceNumber = await generateNextDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_dev' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          project_name: input.project_name,
          tech_stack: input.tech_stack,
          delivery_date: input.delivery_date,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_dev_${invoiceNumber}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const tva = subtotal * (tvaRate / 100);
        const total = subtotal + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation_dev',
            name: fileName,
            invoiceNumber: invoiceNumber,
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
            tvaRate: tvaRate,
            fileSize: pdfBuffer.length,
            createdBy: ctx.user!.id,
            serviceData: {
              project_name: input.project_name,
              tech_stack: input.tech_stack,
              delivery_date: input.delivery_date,
            },
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

  previewPrestationFormation: adminProcedure
    .input(PrestationFormationInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_formation' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          training_date: input.training_date,
          training_time: input.training_time,
          training_location: input.training_location,
          training_duration: input.training_duration,
          training_topic: input.training_topic,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_formation_${invoiceNumber}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
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
        const invoiceNumber = await generateNextDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_formation' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          training_date: input.training_date,
          training_time: input.training_time,
          training_location: input.training_location,
          training_duration: input.training_duration,
          training_topic: input.training_topic,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_formation_${invoiceNumber}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const tva = subtotal * (tvaRate / 100);
        const total = subtotal + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation_formation',
            name: fileName,
            invoiceNumber: invoiceNumber,
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
            tvaRate: tvaRate,
            fileSize: pdfBuffer.length,
            createdBy: ctx.user!.id,
            serviceData: {
              training_date: input.training_date,
              training_time: input.training_time,
              training_location: input.training_location,
              training_duration: input.training_duration,
              training_topic: input.training_topic,
            },
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

  previewPrestationBtp: adminProcedure
    .input(PrestationBtpInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const invoiceNumber = await previewDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_btp' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          site_address: input.site_address,
          site_name: input.site_name,
          work_start_date: input.work_start_date,
          work_type: input.work_type,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_btp_${invoiceNumber}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
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
        const invoiceNumber = await generateNextDocumentNumber(ctx.db, 'invoice');

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

        const tvaRate = Number(provider.tvaRate || 20);

        const documentData = {
          type: 'prestation_btp' as const,
          invoice_number: invoiceNumber,
          invoice_date: input.invoice_date,
          due_date: input.due_date,
          site_address: input.site_address,
          site_name: input.site_name,
          work_start_date: input.work_start_date,
          work_type: input.work_type,
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
          tva_rate: tvaRate,
          railway_estimate: 0,
          providers: [],
          features: [],
          payment_providers: [],
        };

        const pdfBuffer = await generateDocumentWithLogo(documentData, provider.logoUrl, ctx.storage);
        const fileName = `prestation_btp_${invoiceNumber}.pdf`;

        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.price,
          0
        );
        const tva = subtotal * (tvaRate / 100);
        const total = subtotal + tva;

        const document = await ctx.db.document.create({
          data: {
            type: 'prestation_btp',
            name: fileName,
            invoiceNumber: invoiceNumber,
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
            tvaRate: tvaRate,
            fileSize: pdfBuffer.length,
            createdBy: ctx.user!.id,
            serviceData: {
              site_address: input.site_address,
              site_name: input.site_name,
              work_start_date: input.work_start_date,
              work_type: input.work_type,
            },
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
