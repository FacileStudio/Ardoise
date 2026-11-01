import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma, PrismaClient } from '@repo/database';
import type { StorageService } from '@repo/storage';
import spaceService, { scopeWhere, requireRowScope } from '../space/service';
import { parseStorageKey } from '../media/service';
import { syncMissionPaid } from '../mission/sync';
import { DocumentItemSchema } from './types';
import { computeInvoiceTotals, loadDocumentContext, storeDocumentPdf } from './service';

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export const IMPORT_TYPES = [
  'devis',
  'facture_prestation',
  'appel_de_fonds',
  'contrat_prestation',
  'contrat_maintenance',
  'back_contractuel',
  'maintenance',
] as const;

const ImportTypeSchema = z.enum(IMPORT_TYPES);
const ManualSignatureSchema = z.enum(['none', 'signed', 'declined']);
const NumberSchema = z.string().trim().min(1).max(100);

export const ImportDocumentSchema = z
  .object({
    spaceId: z.string().optional(),
    pdfKey: z.string().min(1),
    type: ImportTypeSchema,
    name: z.string().trim().min(1).max(200).optional(),
    number: NumberSchema.optional(),
    clientId: z.string().min(1),
    providerId: z.string().min(1),
    missionId: z.string().min(1).optional(),
    items: z.array(DocumentItemSchema).min(1).optional(),
    total: z.number().nonnegative().optional(),
    tvaRate: z.number().min(0).max(100).optional(),
    issuedAt: z.coerce.date(),
    dueDate: z.coerce.date().optional(),
    signatureStatus: ManualSignatureSchema.default('none'),
    signedAt: z.coerce.date().optional(),
    markPaid: z.boolean().default(false),
    paidAt: z.coerce.date().optional(),
  })
  .refine((value) => value.items !== undefined || value.total !== undefined, {
    message: 'Provide the items or a total',
    path: ['total'],
  })
  .refine((value) => !value.markPaid || value.type === 'facture_prestation', {
    message: 'Only an invoice can be marked as paid',
    path: ['markPaid'],
  });

export const UpdateDocumentSchema = z.object({
  id: z.string().min(1),
  type: ImportTypeSchema.optional(),
  name: z.string().trim().min(1).max(200).optional(),
  number: NumberSchema.nullable().optional(),
  clientId: z.string().min(1).optional(),
  providerId: z.string().min(1).optional(),
  missionId: z.string().min(1).nullable().optional(),
  items: z.array(DocumentItemSchema).min(1).optional(),
  total: z.number().nonnegative().optional(),
  tvaRate: z.number().min(0).max(100).optional(),
  issuedAt: z.coerce.date().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  pdfKey: z.string().min(1).nullable().optional(),
});

export const SetSignatureSchema = z.object({
  id: z.string().min(1),
  status: ManualSignatureSchema,
  signedAt: z.coerce.date().nullable().optional(),
  signedPdfKey: z.string().min(1).optional(),
});

type NumberField = 'invoiceNumber' | 'quoteNumber' | 'contractRef';
type StoredRow = NonNullable<Awaited<ReturnType<PrismaClient['document']['findUnique']>>>;
type Ctx = { db: PrismaClient; storage: StorageService; user: { id: string } };

const round2 = (value: number) => Math.round(value * 100) / 100;

function numberFieldFor(type: string): NumberField {
  if (type === 'facture_prestation') return 'invoiceNumber';
  if (type === 'devis' || type === 'maintenance') return 'quoteNumber';
  return 'contractRef';
}

function currentNumberField(row: StoredRow): NumberField {
  if (row.invoiceNumber != null) return 'invoiceNumber';
  if (row.quoteNumber != null) return 'quoteNumber';
  if (row.contractRef != null) return 'contractRef';
  return numberFieldFor(row.type);
}

export function computeAmounts(
  items: Array<{ quantity: number; price: number }> | undefined,
  total: number | undefined,
  tvaRate: number,
  fallbackName: string
) {
  if (items) {
    const totals = computeInvoiceTotals(items, tvaRate);
    return {
      items,
      subtotal: round2(totals.subtotal),
      tva: round2(totals.tva),
      total: round2(totals.total),
    };
  }

  const gross = round2(total ?? 0);
  const subtotal = round2(gross / (1 + tvaRate / 100));
  return {
    items: [{ description: fallbackName, quantity: 1, unit: 'forfait', price: subtotal }],
    subtotal,
    tva: round2(gross - subtotal),
    total: gross,
  };
}

function clientColumns(client: {
  companyName: string;
  siret?: string | null;
  tvaIntracom?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
}) {
  return {
    clientName: client.companyName,
    clientSiret: client.siret || null,
    clientTvaIntracom: client.tvaIntracom || null,
    clientAddress: client.billingAddress || null,
    clientCity: client.billingCity || null,
    clientPostalCode: client.billingPostalCode || null,
    clientCountry: client.billingCountry || null,
  };
}

function providerColumns(provider: {
  id: string;
  name: string;
  legalName?: string | null;
  siret?: string | null;
  tvaIntracom?: string | null;
  legalForm?: string | null;
  shareCapital?: unknown;
  rcsCity?: string | null;
  apeCode?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return {
    providerId: provider.id,
    providerName: provider.name,
    providerLegal: provider.legalName || provider.name,
    providerSiret: provider.siret || null,
    providerTvaIntracom: provider.tvaIntracom || null,
    providerLegalForm: provider.legalForm || null,
    providerShareCapital: (provider.shareCapital ?? null) as never,
    providerRcsCity: provider.rcsCity || null,
    providerApeCode: provider.apeCode || null,
    providerAddress: provider.address || null,
    providerCity: provider.city || null,
    providerPostalCode: provider.postalCode || null,
    providerEmail: provider.email || null,
    providerPhone: provider.phone || null,
  };
}

export async function storeUploadedPdf(storage: StorageService, userId: string, key: string) {
  const segments = key.split('/');
  if (
    !key.startsWith(`uploads/${userId}/`) ||
    segments.includes('..') ||
    segments.includes('.')
  ) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid file key' });
  }

  let data: Buffer;
  try {
    data = Buffer.from(await storage.download(key));
  } catch {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Uploaded file not found' });
  }

  if (data.length > MAX_PDF_BYTES || data.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The uploaded file is not a PDF' });
  }

  const stored = await storeDocumentPdf(storage, data);
  await storage.delete(key).catch(() => false);
  return { ...stored, fileSize: data.length };
}

export async function removeStoredPdf(storage: StorageService, pdfUrl: string | null) {
  const key = parseStorageKey(pdfUrl);
  if (key?.startsWith('documents/')) await storage.delete(key).catch(() => false);
}

async function assertNumberFree(
  db: PrismaClient,
  field: NumberField,
  number: string,
  spaceId: string | null,
  exceptId?: string
) {
  if (field === 'contractRef') return;
  const clash = await db.document.findFirst({
    where: { [field]: number, spaceId, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: `A document numbered ${number} already exists in this space`,
    });
  }
}

export async function importDocument(ctx: Ctx, input: z.infer<typeof ImportDocumentSchema>) {
  const { client, provider, tvaRate: providerRate, scope, missionId } = await loadDocumentContext(
    ctx.db,
    ctx.user.id,
    input.clientId,
    input.providerId,
    input.spaceId,
    input.missionId
  );
  const field = numberFieldFor(input.type);
  const spaceId = scopeWhere(scope).spaceId;
  if (input.number) await assertNumberFree(ctx.db, field, input.number, spaceId);

  const tvaRate = Math.round(input.tvaRate ?? providerRate);
  const name = input.name ?? `${input.type}${input.number ? `_${input.number}` : ''}.pdf`;
  const amounts = computeAmounts(input.items, input.total, tvaRate, name);
  const stored = await storeUploadedPdf(ctx.storage, ctx.user.id, input.pdfKey);
  const reference = input.number ?? name;

  const signed = input.signatureStatus === 'signed';

  const document = await ctx.db.document.create({
    data: {
      id: stored.id,
      type: input.type,
      name,
      [field]: input.number ?? null,
      ...clientColumns(client),
      ...providerColumns(provider),
      spaceId,
      missionId,
      items: amounts.items,
      subtotal: amounts.subtotal,
      tva: amounts.tva,
      total: amounts.total,
      tvaRate,
      pdfUrl: stored.pdfUrl,
      pdfHash: stored.pdfHash,
      fileSize: stored.fileSize,
      source: 'imported',
      issuedAt: input.issuedAt,
      dueDate: input.dueDate ?? null,
      signatureStatus: input.signatureStatus,
      signedAt: signed ? (input.signedAt ?? input.issuedAt) : null,
      createdBy: ctx.user.id,
      payments: input.markPaid
        ? {
            create: {
              clientId: client.id,
              spaceId,
              missionId,
              amount: amounts.total,
              totalWithFees: amounts.total,
              description: `Facture ${reference}`,
              reference: input.number ?? null,
              status: 'PAID',
              collectionMethod: 'MANUAL',
              dueDate: input.dueDate ?? input.issuedAt,
              paidAt: input.paidAt ?? input.issuedAt,
              attachedDocuments: { create: { documentId: stored.id } },
            },
          }
        : undefined,
    } as Prisma.DocumentUncheckedCreateInput,
    include: { payments: true },
  });

  if (input.markPaid) await syncMissionPaid(ctx.db, missionId);

  return document;
}

const CONTENT_KEYS = [
  'type',
  'number',
  'clientId',
  'providerId',
  'items',
  'total',
  'tvaRate',
  'issuedAt',
  'dueDate',
] as const;

export async function updateDocument(ctx: Ctx, input: z.infer<typeof UpdateDocumentSchema>) {
  const existing = await requireRowScope(
    ctx.db,
    ctx.user.id,
    await ctx.db.document.findUnique({ where: { id: input.id } }),
    'Document not found'
  );
  const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, existing.spaceId);
  const imported = existing.source === 'imported';

  if (input.total !== undefined && !imported) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A generated document is priced by its items',
    });
  }

  const data: Prisma.DocumentUncheckedUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.issuedAt !== undefined) data.issuedAt = input.issuedAt;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;

  const finalType = input.type ?? existing.type;
  if (input.type !== undefined) data.type = input.type;

  if (input.type !== undefined || input.number !== undefined) {
    const previous = existing.invoiceNumber ?? existing.quoteNumber ?? existing.contractRef;
    const next = input.number !== undefined ? input.number : previous;
    const field = input.type !== undefined ? numberFieldFor(finalType) : currentNumberField(existing);
    if (next) await assertNumberFree(ctx.db, field, next, existing.spaceId, existing.id);
    data.invoiceNumber = null;
    data.quoteNumber = null;
    data.contractRef = null;
    data[field] = next;
  }

  if (input.clientId !== undefined) {
    const client = await ctx.db.client.findFirst({
      where: { id: input.clientId, ...scopeWhere(scope) },
    });
    if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
    Object.assign(data, clientColumns(client));
  }

  if (input.providerId !== undefined) {
    const provider = await ctx.db.provider.findFirst({
      where: { id: input.providerId, ...scopeWhere(scope) },
    });
    if (!provider) throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
    Object.assign(data, providerColumns(provider));
  }

  if (input.missionId !== undefined) {
    if (input.missionId === null) {
      data.missionId = null;
    } else {
      const mission = await ctx.db.mission.findFirst({
        where: {
          id: input.missionId,
          ...scopeWhere(scope),
          ...(input.clientId ? { clientId: input.clientId } : {}),
        },
        select: { id: true },
      });
      if (!mission) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mission not found' });
      data.missionId = mission.id;
    }
  }

  if (input.items !== undefined || input.total !== undefined || input.tvaRate !== undefined) {
    const tvaRate = Math.round(input.tvaRate ?? existing.tvaRate);
    const items =
      input.items ??
      (input.total === undefined ? (existing.items as Array<{ quantity: number; price: number }>) : undefined);
    const amounts = computeAmounts(items, input.total, tvaRate, input.name ?? existing.name);
    data.items = amounts.items;
    data.subtotal = amounts.subtotal;
    data.tva = amounts.tva;
    data.total = amounts.total;
    data.tvaRate = tvaRate;
  }

  const contentChanged = CONTENT_KEYS.some((key) => input[key] !== undefined);
  const replacing = input.pdfKey !== undefined;
  const locked = existing.signatureStatus === 'sent' || existing.signatureStatus === 'signed';

  if (!imported && contentChanged && !replacing && locked) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'This document is out for signature or signed, so its content cannot change.',
    });
  }

  let pdfStale = false;
  let staleUrl: string | null = null;

  if (typeof input.pdfKey === 'string') {
    const stored = await storeUploadedPdf(ctx.storage, ctx.user.id, input.pdfKey);
    data.pdfUrl = stored.pdfUrl;
    data.pdfHash = stored.pdfHash;
    data.fileSize = stored.fileSize;
    staleUrl = existing.pdfUrl;
  } else if (input.pdfKey === null || (!imported && contentChanged && existing.pdfUrl)) {
    data.pdfUrl = null;
    data.pdfHash = null;
    data.fileSize = null;
    staleUrl = existing.pdfUrl;
    pdfStale = !imported && input.pdfKey !== null;
  }

  const document = await ctx.db.document.update({ where: { id: existing.id }, data });
  if (staleUrl) await removeStoredPdf(ctx.storage, staleUrl);

  return { document, pdfStale };
}

export async function setDocumentSignature(ctx: Ctx, input: z.infer<typeof SetSignatureSchema>) {
  const existing = await requireRowScope(
    ctx.db,
    ctx.user.id,
    await ctx.db.document.findUnique({ where: { id: input.id } }),
    'Document not found'
  );

  if (input.signedPdfKey && input.status !== 'signed') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A signed PDF only goes with the signed status',
    });
  }

  const data: Prisma.DocumentUncheckedUpdateInput = {
    signatureStatus: input.status,
    signedAt: input.status === 'signed' ? (input.signedAt ?? new Date()) : null,
  };

  if (input.signedPdfKey) {
    const stored = await storeUploadedPdf(ctx.storage, ctx.user.id, input.signedPdfKey);
    data.pdfUrl = stored.pdfUrl;
    data.pdfHash = stored.pdfHash;
    data.fileSize = stored.fileSize;
  }

  const document = await ctx.db.document.update({
    where: { id: existing.id },
    data,
    select: {
      id: true,
      signatureStatus: true,
      signedAt: true,
      plumeDocumentId: true,
      plumeUrl: true,
      plumeClientSignUrl: true,
      nuageArchivedAt: true,
      pdfUrl: true,
      pdfHash: true,
    },
  });

  if (input.signedPdfKey) await removeStoredPdf(ctx.storage, existing.pdfUrl);

  return document;
}
