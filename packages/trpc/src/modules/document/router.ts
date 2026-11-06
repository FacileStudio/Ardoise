import { router, memberProcedure } from '../../trpc';
import {
  generateTypstContent,
  buildPartyAndLegalData,
  buildDocumentLegalPersistence,
  buildDocumentPersistenceBase,
  loadDocumentContext,
  computeInvoiceTotals,
  storeDocumentPdf,
  ContratPrestationInputSchema,
  ContratMaintenanceInputSchema,
  BackContractuelInputSchema,
  AppelDeFondsInputSchema,
  type DocType,
  type DocumentData,
} from './service';
import { FacturePrestationInputSchema, MaintenanceInputSchema } from './types';
import {
  PrestationDesignInputSchema,
  PrestationDevInputSchema,
  PrestationFormationInputSchema,
  PrestationBtpInputSchema,
  PrestationBarmanInputSchema,
  PrestationPhotoInputSchema,
  PrestationVideoInputSchema,
} from './services/schemas';
import { previewDocumentNumber, withDocumentNumber } from './numbering';
import { generateDocumentWithLogo } from './render';
import spaceService, { scopeSpaceId, scopeWhere, requireRowScope } from '../space/service';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma, PrismaClient } from '@repo/database';
import { parseStorageKey } from '../media/service';
import { isPlatformStudio, providersOfSpace, requirePlatformStudio } from '../space/studio';
import type { StorageService } from '@repo/storage';
import { nuageConfigFromEnv, storeContractInNuage } from '@repo/nuage';
import {
  PlumeError,
  contractExternalRef,
  plumeConfigFromEnv,
  sendForSignature,
  signingUrlFor,
} from '@repo/plume';
import { ensureClientSignUrl, resolveSignatureClient } from './sign-link';
import {
  ImportDocumentSchema,
  UpdateDocumentSchema,
  SetSignatureSchema,
  importDocument,
  updateDocument,
  setDocumentSignature,
  removeStoredPdf,
} from './manual';
import { logger } from '@repo/logger';
import type { ServerEnv } from '@repo/env';

const spaceScoped = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({ spaceId: z.string().optional(), missionId: z.string().optional() });

/**
 * Lets a deliberate TRPCError keep its own code and message, and turns anything
 * else into a 500. Re-wrapping every failure collapsed FORBIDDEN and NOT_FOUND
 * into one status while still shipping the message that told them apart.
 */
function rethrowUnexpected(error: unknown, fallbackMessage: string): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error && error.message ? error.message : fallbackMessage,
  });
}

const SIGNABLE_TYPES: string[] = ['contrat_prestation', 'contrat_maintenance', 'back_contractuel'];

/** Archives a contract in the platform Nuage, fire and forget, only for a platform studio space. */
function archiveContract(
  db: PrismaClient,
  env: ServerEnv,
  document: { id: string; name: string; spaceId: string },
  pdf: Buffer
) {
  void isPlatformStudio(db, document.spaceId)
    .then((studio) =>
      studio
        ? storeContractInNuage(nuageConfigFromEnv(env), {
            filename: document.name,
            pdf,
            linkedTo: `ardoise:contract:${document.id}`,
          })
        : undefined
    )
    .catch(() => undefined);
}

async function fetchProvidersByIds(db: PrismaClient, spaceId: string, ids: string[]) {
  const providers = await db.provider.findMany({ where: { AND: [{ id: { in: ids } }, await providersOfSpace(db, spaceId)] } });
  if (providers.length !== ids.length) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'One or more providers not found' });
  }
  return providers as Array<{ id: string; name: string; address: string | null; city: string | null; siret: string | null; email: string | null; iban: string | null; bic: string | null }>;
}

async function resolveSubProvidersForBack(db: PrismaClient, spaceId: string, inputs: Array<{ id: string; role: string; amount: number }>) {
  const providers = await fetchProvidersByIds(db, spaceId, inputs.map(p => p.id));
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
  spaceId?: string;
  missionId?: string;
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
  const { client, provider, settings, tvaRate, scope } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId);
  const invoiceNumber = await previewDocumentNumber(ctx.db, scopeSpaceId(scope), 'invoice');

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
  const { client, provider, settings, tvaRate, scope, missionId } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId, input.missionId);
  return withDocumentNumber(ctx.db, scopeSpaceId(scope), 'invoice', async (invoiceNumber, tx) => {
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

    const stored = await storeDocumentPdf(ctx.storage, pdfBuffer);

    const document = await tx.document.create({
      data: {
        type,
        name: fileName,
        invoiceNumber,
        ...buildDocumentPersistenceBase(
          documentData,
          input.providerId,
          pdfBuffer.length,
          ctx.user!.id,
          legalPersistence,
          scope,
          missionId,
          stored
        ),
        items: input.items,
        subtotal,
        tva,
        total,
        tvaRate,
        serviceData: typeSpecificData as Prisma.InputJsonObject,
      },
    });

    return {
      document,
      pdf: pdfBuffer.toString('base64'),
      fileName,
    };
  });
}

async function resolveSubProvidersForAppel(db: PrismaClient, spaceId: string, inputs: Array<{ id: string; amount_to_pay: number }>) {
  const providers = await fetchProvidersByIds(db, spaceId, inputs.map(p => p.id));
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

type StoredDocument = NonNullable<Awaited<ReturnType<PrismaClient['document']['findUnique']>>>;

async function loadDocumentPdf(
  ctx: { db: PrismaClient; storage: StorageService },
  document: StoredDocument
): Promise<Buffer> {
  const storedKey = parseStorageKey(document.pdfUrl);

  if (storedKey) {
    return Buffer.from(await ctx.storage.download(storedKey));
  }

  if (document.source === 'imported') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This imported document has no PDF attached.',
    });
  }

  const issued = (document.issuedAt ?? document.createdAt).toISOString().split('T')[0];

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
    invoice_date: issued,
    due_date: (document.dueDate ?? document.createdAt).toISOString().split('T')[0],
    quote_number: document.quoteNumber || '',
    quote_date: issued,
    validity_date: document.createdAt.toISOString().split('T')[0],
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
    tva_rate: document.tvaRate ?? 20,
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

  return generateDocumentWithLogo(documentData, logoUrl, ctx.storage);
}

export const documentRouter = router({
  list: memberProcedure
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

      const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId);
      const where: Prisma.DocumentWhereInput = { ...scopeWhere(scope) };
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
        where.type = type as Prisma.DocumentWhereInput['type'];
      }

      const [items, total] = await Promise.all([
        ctx.db.document.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            space: { select: { id: true, name: true } },
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

  get: memberProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return requireRowScope(
        ctx.db,
        ctx.user.id,
        await ctx.db.document.findUnique({
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
        }),
        'Document not found'
      );
    }),

  delete: memberProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const document = await requireRowScope(
        ctx.db,
        ctx.user.id,
        await ctx.db.document.findUnique({
          where: { id: input.id },
        }),
        'Document not found'
      );

      const [payments, invoices] = await Promise.all([
        ctx.db.payment.count({
          where: { documentId: document.id, status: { in: ['PENDING', 'PAID', 'PAST_DUE'] } },
        }),
        ctx.db.document.count({ where: { sourceQuoteId: document.id } }),
      ]);

      if (payments > 0 || invoices > 0) {
        const blockers = [
          payments > 0 ? `${payments} payment(s)` : null,
          invoices > 0 ? `${invoices} invoice(s) generated from it` : null,
        ].filter(Boolean);
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `This document is still referenced by ${blockers.join(' and ')}. Delete or cancel them first.`,
        });
      }

      await ctx.db.document.delete({
        where: { id: input.id },
      });
      await removeStoredPdf(ctx.storage, document.pdfUrl);

      return { success: true };
    }),

  import: memberProcedure.input(ImportDocumentSchema).mutation(async ({ input, ctx }) => {
    try {
      return await importDocument(ctx, input);
    } catch (error) {
      rethrowUnexpected(error, 'Failed to import the document');
    }
  }),

  update: memberProcedure.input(UpdateDocumentSchema).mutation(async ({ input, ctx }) => {
    try {
      return await updateDocument(ctx, input);
    } catch (error) {
      rethrowUnexpected(error, 'Failed to update the document');
    }
  }),

  setSignature: memberProcedure.input(SetSignatureSchema).mutation(async ({ input, ctx }) => {
    try {
      return await setDocumentSignature(ctx, input);
    } catch (error) {
      rethrowUnexpected(error, 'Failed to set the signature');
    }
  }),

  refreshSignLink: memberProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const document = await requireRowScope(
        ctx.db,
        ctx.user.id,
        await ctx.db.document.findUnique({ where: { id: input.id } }),
        'Document not found'
      );

      return { url: await ensureClientSignUrl(ctx, document) };
    }),

  types: memberProcedure.query(() => {
    return [
      { value: 'devis', label: 'Devis' },
      { value: 'facture_prestation', label: 'Facture' },
      { value: 'maintenance', label: 'Devis maintenance' },
      { value: 'contrat_prestation', label: 'Contrat de prestation' },
      { value: 'contrat_maintenance', label: 'Contrat de maintenance' },
      { value: 'back_contractuel', label: 'Back contractuel' },
      { value: 'appel_de_fonds', label: 'Appel de fonds' },
    ];
  }),

  /**
   * Whether contracts can go to Plume: Plume is configured and the space (or,
   * without one, any space of the caller) is a platform studio space.
   */
  signatureEnabled: memberProcedure
    .input(z.object({ spaceId: z.string().min(1).optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (plumeConfigFromEnv(ctx.env) === null) return { enabled: false };
      if (input?.spaceId) {
        const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input.spaceId);
        return { enabled: await isPlatformStudio(ctx.db, scopeSpaceId(scope)) };
      }
      const studio = await ctx.db.spaceMember.findFirst({
        where: { userId: ctx.user.id, space: { platformStudio: true } },
        select: { id: true },
      });
      return { enabled: studio !== null };
    }),

  sendForSignature: memberProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const plume = plumeConfigFromEnv(ctx.env);
      if (!plume) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Plume is not configured on this server.',
        });
      }

      const document = await requireRowScope(
        ctx.db,
        ctx.user.id,
        await ctx.db.document.findUnique({ where: { id: input.id } }),
        'Document not found'
      );
      await requirePlatformStudio(ctx.db, document.spaceId);

      if (!SIGNABLE_TYPES.includes(document.type)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only contracts can be sent for signature.',
        });
      }

      if (document.signatureStatus !== 'none') {
        const message = {
          sent: 'This document was already sent for signature.',
          signed: 'This document is already signed.',
          declined: 'The signers declined this document.',
        }[document.signatureStatus];
        throw new TRPCError({ code: 'CONFLICT', message });
      }

      const client = await resolveSignatureClient(ctx.db, document);
      if (!client?.contactEmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'The client has no email address, so it cannot be asked to sign.',
        });
      }
      if (!document.providerEmail) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'The provider has no email address, so it cannot be asked to sign.',
        });
      }

      const nuage = nuageConfigFromEnv(ctx.env);
      const externalRef = contractExternalRef(document.id);

      try {
        const pdf = await loadDocumentPdf(ctx, document);
        const sent = await sendForSignature(plume, {
          name: document.name,
          filename: document.name.endsWith('.pdf') ? document.name : `${document.name}.pdf`,
          pdf,
          signers: [
            {
              name: `${client.contactFirstName} ${client.contactLastName}`.trim(),
              email: client.contactEmail,
              order: 1,
            },
            { name: document.providerName, email: document.providerEmail, order: 2 },
          ],
          externalRef,
          client: {
            name: `${client.contactFirstName} ${client.contactLastName}`.trim(),
            email: client.contactEmail,
            company: client.companyName,
          },
          nuageSpaceFacileId: nuage?.spaceFacileId,
          nuageLinkedTo: nuage ? `${externalRef}:signed` : undefined,
        });

        return await ctx.db.document.update({
          where: { id: document.id },
          data: {
            signatureStatus: 'sent',
            plumeDocumentId: sent.documentId,
            plumeUrl: sent.url,
            plumeClientSignUrl: signingUrlFor(sent.signers, client.contactEmail),
          },
          select: {
            id: true,
            signatureStatus: true,
            plumeDocumentId: true,
            plumeUrl: true,
            plumeClientSignUrl: true,
            signedAt: true,
            nuageArchivedAt: true,
          },
        });
      } catch (error) {
        if (error instanceof PlumeError) {
          logger.warn({ err: error, documentId: document.id }, 'Plume rejected the document');
          throw new TRPCError({
            code: 'BAD_GATEWAY',
            message: `Could not send the document to Plume: ${error.message}`,
          });
        }
        rethrowUnexpected(error, 'Failed to send the document for signature');
      }
    }),

  download: memberProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const document = await requireRowScope(
        ctx.db,
        ctx.user.id,
        await ctx.db.document.findUnique({
          where: { id: input.id },
        }),
        'Document not found'
      );

      try {
        const pdf = await loadDocumentPdf(ctx, document);

        return { pdf: pdf.toString('base64'), fileName: document.name };
      } catch (error) {
        rethrowUnexpected(error, 'Failed to download document');
      }
    }),

  previewFacturePrestation: memberProcedure
    .input(spaceScoped(FacturePrestationInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate, scope } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId);
        const invoiceNumber = await previewDocumentNumber(ctx.db, scopeSpaceId(scope), 'invoice');

        const documentData = {
          type: 'facture_prestation' as const,
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
        const fileName = `facture_prestation_${invoiceNumber}.pdf`;

        return {
          pdf: pdfBuffer.toString('base64'),
          fileName,
          typstContent: generateTypstContent(documentData),
        };
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate facture prestation preview');
      }
    }),

  createFacturePrestation: memberProcedure
    .input(spaceScoped(FacturePrestationInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate, scope, missionId } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId, input.missionId);
        return await withDocumentNumber(ctx.db, scopeSpaceId(scope), 'invoice', async (invoiceNumber, tx) => {
          const documentData = {
            type: 'facture_prestation' as const,
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
          const fileName = `facture_prestation_${invoiceNumber}.pdf`;
          const { subtotal, tva, total } = computeInvoiceTotals(input.items, tvaRate, input.railway_estimate);
          const legalPersistence = buildDocumentLegalPersistence(client, provider, settings);

          const stored = await storeDocumentPdf(ctx.storage, pdfBuffer);

          const document = await tx.document.create({
            data: {
              type: 'facture_prestation',
              name: fileName,
              invoiceNumber,
              ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence, scope, missionId, stored),
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
        });
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create facture prestation');
      }
    }),

  previewMaintenance: memberProcedure
    .input(spaceScoped(MaintenanceInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate, scope } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId);
        const quoteNumber = await previewDocumentNumber(ctx.db, scopeSpaceId(scope), 'quote');

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
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate maintenance preview');
      }
    }),

  createMaintenance: memberProcedure
    .input(spaceScoped(MaintenanceInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate, scope, missionId } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId, input.missionId);
        return await withDocumentNumber(ctx.db, scopeSpaceId(scope), 'quote', async (quoteNumber, tx) => {
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

          const stored = await storeDocumentPdf(ctx.storage, pdfBuffer);

          const document = await tx.document.create({
            data: {
              type: 'maintenance',
              name: fileName,
              quoteNumber,
              ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence, scope, missionId, stored),
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
        });
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create maintenance');
      }
    }),

  previewBackContractuel: memberProcedure
    .input(spaceScoped(BackContractuelInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId);
        const providersWithDetails = await resolveSubProvidersForBack(ctx.db, client.spaceId, input.providers);

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
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate preview');
      }
    }),

  createBackContractuel: memberProcedure
    .input(spaceScoped(BackContractuelInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate, scope, missionId } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId, input.missionId);
        const providersWithDetails = await resolveSubProvidersForBack(ctx.db, client.spaceId, input.providers);

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

        const stored = await storeDocumentPdf(ctx.storage, pdfBuffer);

        const document = await ctx.db.document.create({
          data: {
            type: 'back_contractuel',
            name: fileName,
            contractRef: input.contract_reference,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence, scope, missionId, stored),
            items: input.items || [],
            subtotal,
            tva,
            total,
            tvaRate,
          },
        });

        archiveContract(ctx.db, ctx.env, document, pdfBuffer);

        return {
          document,
          pdf: pdfBuffer.toString('base64'),
          fileName,
        };
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create document');
      }
    }),

  previewAppelDeFonds: memberProcedure
    .input(spaceScoped(AppelDeFondsInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId);
        const paymentProvidersWithDetails = await resolveSubProvidersForAppel(ctx.db, client.spaceId, input.payment_providers);

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
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate preview');
      }
    }),

  createAppelDeFonds: memberProcedure
    .input(spaceScoped(AppelDeFondsInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate, scope, missionId } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId, input.missionId);
        const paymentProvidersWithDetails = await resolveSubProvidersForAppel(ctx.db, client.spaceId, input.payment_providers);

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

        const stored = await storeDocumentPdf(ctx.storage, pdfBuffer);

        const document = await ctx.db.document.create({
          data: {
            type: 'appel_de_fonds',
            name: fileName,
            invoiceNumber: input.global_invoice_ref,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence, scope, missionId, stored),
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
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create document');
      }
    }),

  previewContratPrestation: memberProcedure
    .input(spaceScoped(ContratPrestationInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId);

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
      } catch (error) {
        rethrowUnexpected(error, 'Failed to preview contract');
      }
    }),

  createContratPrestation: memberProcedure
    .input(spaceScoped(ContratPrestationInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate, scope, missionId } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId, input.missionId);

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

        const stored = await storeDocumentPdf(ctx.storage, pdfBuffer);

        const document = await ctx.db.document.create({
          data: {
            type: 'contrat_prestation',
            name: fileName,
            contractRef: input.contract_reference,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence, scope, missionId, stored),
            items: [],
            subtotal: 0,
            tva: 0,
            total: 0,
            tvaRate,
          },
        });

        archiveContract(ctx.db, ctx.env, document, pdfBuffer);

        return {
          document,
          pdf: pdfBuffer.toString('base64'),
          fileName,
        };
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create contract');
      }
    }),

  previewContratMaintenance: memberProcedure
    .input(spaceScoped(ContratMaintenanceInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId);

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
      } catch (error) {
        rethrowUnexpected(error, 'Failed to preview contract');
      }
    }),

  createContratMaintenance: memberProcedure
    .input(spaceScoped(ContratMaintenanceInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { client, provider, settings, tvaRate, scope, missionId } = await loadDocumentContext(ctx.db, ctx.user!.id, input.clientId, input.providerId, input.spaceId, input.missionId);

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

        const stored = await storeDocumentPdf(ctx.storage, pdfBuffer);

        const document = await ctx.db.document.create({
          data: {
            type: 'contrat_maintenance',
            name: fileName,
            contractRef: input.contract_reference,
            ...buildDocumentPersistenceBase(documentData, input.providerId, pdfBuffer.length, ctx.user!.id, legalPersistence, scope, missionId, stored),
            items: [],
            subtotal: 0,
            tva: 0,
            total: 0,
            tvaRate,
          },
        });

        archiveContract(ctx.db, ctx.env, document, pdfBuffer);

        return {
          document,
          pdf: pdfBuffer.toString('base64'),
          fileName,
        };
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create contract');
      }
    }),

  previewPrestationBarman: memberProcedure
    .input(spaceScoped(PrestationBarmanInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_barman',
          'prestation_barman',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate prestation barman preview');
      }
    }),

  createPrestationBarman: memberProcedure
    .input(spaceScoped(PrestationBarmanInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_barman',
          'prestation_barman',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create prestation barman');
      }
    }),

  previewPrestationPhoto: memberProcedure
    .input(spaceScoped(PrestationPhotoInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_photo',
          'prestation_photo',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate prestation photo preview');
      }
    }),

  createPrestationPhoto: memberProcedure
    .input(spaceScoped(PrestationPhotoInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_photo',
          'prestation_photo',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create prestation photo');
      }
    }),

  previewPrestationVideo: memberProcedure
    .input(spaceScoped(PrestationVideoInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_video',
          'prestation_video',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate prestation video preview');
      }
    }),

  createPrestationVideo: memberProcedure
    .input(spaceScoped(PrestationVideoInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_video',
          'prestation_video',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create prestation video');
      }
    }),

  previewPrestationDesign: memberProcedure
    .input(spaceScoped(PrestationDesignInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_design',
          'prestation_design',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate preview');
      }
    }),

  createPrestationDesign: memberProcedure
    .input(spaceScoped(PrestationDesignInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_design',
          'prestation_design',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create document');
      }
    }),

  previewPrestationDev: memberProcedure
    .input(spaceScoped(PrestationDevInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_dev',
          'prestation_dev',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate preview');
      }
    }),

  createPrestationDev: memberProcedure
    .input(spaceScoped(PrestationDevInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_dev',
          'prestation_dev',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create document');
      }
    }),

  previewPrestationFormation: memberProcedure
    .input(spaceScoped(PrestationFormationInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_formation',
          'prestation_formation',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate preview');
      }
    }),

  createPrestationFormation: memberProcedure
    .input(spaceScoped(PrestationFormationInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_formation',
          'prestation_formation',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create document');
      }
    }),

  previewPrestationBtp: memberProcedure
    .input(spaceScoped(PrestationBtpInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await previewSpecializedPrestation(
          'prestation_btp',
          'prestation_btp',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to generate preview');
      }
    }),

  createPrestationBtp: memberProcedure
    .input(spaceScoped(PrestationBtpInputSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        const { invoice_date, due_date, clientId, providerId, items, spaceId, ...typeSpecific } = input;
        return await createSpecializedPrestation(
          'prestation_btp',
          'prestation_btp',
          { invoice_date, due_date, clientId, providerId, items, spaceId },
          typeSpecific,
          ctx
        );
      } catch (error) {
        rethrowUnexpected(error, 'Failed to create document');
      }
    }),
});
