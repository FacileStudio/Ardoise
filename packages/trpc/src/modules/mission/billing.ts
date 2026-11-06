import { TRPCError } from '@trpc/server';
import { Prisma } from '@repo/database';
import type { PrismaClient } from '@repo/database';
import type { StorageService } from '@repo/storage';
import { withDocumentNumber } from '../document/numbering';
import { scopeSpaceId } from '../space/service';
import { generateDocumentWithLogo } from '../document/render';
import {
  loadDocumentContext,
  buildPartyAndLegalData,
  buildDocumentLegalPersistence,
  buildDocumentPersistenceBase,
  storeDocumentPdf,
  type DocumentData,
} from '../document/service';
import { requireRowScope } from '../space/service';
import {
  billingState,
  planInvoice,
  toBillingLines,
  toCents,
  totalsOf,
  type BillingLine,
  type InvoiceKind,
} from './billing-math';
import type { AcceptQuoteInput, GenerateInvoiceInput, GenerateQuoteInput } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

const INVOICE_TITLES: Record<InvoiceKind, string> = {
  FULL: 'FACTURE',
  DEPOSIT: "FACTURE D'ACOMPTE",
  BALANCE: 'FACTURE DE SOLDE',
};

const isoDay = (date: Date) => date.toISOString().split('T')[0];

function reject(message: string): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message });
}

export async function loadBilling(db: PrismaClient, userId: string, id: string) {
  const mission = await requireRowScope(
    db,
    userId,
    await db.mission.findUnique({
      where: { id },
      include: { providers: true, prestations: { orderBy: { position: 'asc' } } },
    }),
    'Mission not found'
  );

  const [currentQuote, invoices] = await Promise.all([
    db.document.findFirst({
      where: { missionId: id, type: 'devis' },
      orderBy: { version: 'desc' },
    }),
    db.document.findMany({
      where: { missionId: id, invoiceNumber: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, invoiceNumber: true, invoiceKind: true, subtotal: true },
    }),
  ]);

  const lines = toBillingLines(mission.prestations);
  const depositPercent = mission.depositPercent == null ? null : Number(mission.depositPercent);
  const state = billingState({
    status: mission.status,
    lines,
    depositPercent,
    currentQuote,
    invoices,
  });

  return { mission, lines, depositPercent, currentQuote, invoices, state };
}

function issuerOf(mission: { providers: Array<{ providerId: string; role: string }> }) {
  const issuer = mission.providers.find((link) => link.role === 'LEAD') ?? mission.providers[0];

  if (!issuer) reject('Link a provider to the mission before generating a document');

  return issuer.providerId;
}

export async function generateQuote(
  db: PrismaClient,
  storage: StorageService,
  userId: string,
  input: GenerateQuoteInput
) {
  const { mission, lines, depositPercent, currentQuote, state } = await loadBilling(
    db,
    userId,
    input.id
  );

  if (mission.status === 'CANCELLED') reject('Mission is cancelled');
  if (state.locked) reject('The mission is fully invoiced');
  if (lines.length === 0) reject('Add at least one prestation before generating a quote');
  if (!state.needsQuote) reject('The current quote already matches the prestations');

  const providerId = issuerOf(mission);
  const { client, provider, settings, tvaRate, scope, missionId } = await loadDocumentContext(
    db,
    userId,
    mission.clientId,
    providerId,
    mission.spaceId,
    mission.id
  );

  try {
    return await withDocumentNumber(db, scopeSpaceId(scope), 'quote', async (quoteNumber, tx) => {
      const today = new Date();
      const documentData = {
        type: 'devis' as const,
        quote_number: quoteNumber,
        quote_date: isoDay(today),
        validity_date: isoDay(new Date(today.getTime() + input.validityDays * DAY_MS)),
        project_name: mission.name,
        deposit_percent: depositPercent ?? '',
        clientId: client.id,
        providerId,
        ...buildPartyAndLegalData(client, provider, settings),
        items: lines,
        tva_rate: tvaRate,
      };

      const pdf = await generateDocumentWithLogo(documentData, provider.logoUrl, storage);
      const stored = await storeDocumentPdf(storage, pdf);
      const { subtotal, tva, total } = totalsOf(lines, tvaRate);

      const document = await tx.document.create({
        data: {
          type: 'devis',
          name: `devis_${quoteNumber}.pdf`,
          quoteNumber,
          version: (currentQuote?.version ?? 0) + 1,
          ...buildDocumentPersistenceBase(
            documentData as DocumentData,
            providerId,
            pdf.length,
            userId,
            buildDocumentLegalPersistence(client, provider, settings),
            scope,
            missionId,
            stored
          ),
          items: lines as unknown as Prisma.InputJsonValue,
          subtotal,
          tva,
          total,
          tvaRate,
          serviceData: { depositPercent } as Prisma.InputJsonValue,
        },
      });

      await tx.mission.updateMany({
        where: { id: mission.id, status: { in: ['DRAFT', 'QUOTED', 'ACCEPTED'] } },
        data: { status: 'QUOTED' },
      });

      return document;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A quote was generated at the same time. Reload and try again.',
      });
    }

    throw error;
  }
}

export async function acceptQuote(db: PrismaClient, userId: string, input: AcceptQuoteInput) {
  const { mission, currentQuote, state } = await loadBilling(db, userId, input.id);

  if (mission.status === 'CANCELLED') reject('Mission is cancelled');
  if (!currentQuote || currentQuote.id !== input.documentId) {
    reject('Only the latest quote can be accepted');
  }
  if (currentQuote.acceptedAt) reject('This quote is already accepted');
  if (state.quoteOutdated) {
    reject('The prestations changed since this quote. Generate a new quote first.');
  }

  const document = await db.document.update({
    where: { id: currentQuote.id },
    data: { acceptedAt: new Date() },
  });

  await db.mission.updateMany({
    where: { id: mission.id, status: 'QUOTED' },
    data: { status: 'ACCEPTED' },
  });

  return document;
}

async function checkedInvoicePlan(db: PrismaClient, userId: string, input: GenerateInvoiceInput) {
  const loaded = await loadBilling(db, userId, input.id);
  const { mission, depositPercent, currentQuote, invoices, state } = loaded;

  if (mission.status === 'CANCELLED') reject('Mission is cancelled');
  if (state.locked) reject('The mission is already fully invoiced');
  if (!currentQuote?.acceptedAt) reject('Accept the quote before invoicing');
  if (state.quoteOutdated) {
    reject('The prestations changed since the accepted quote. Generate and accept a new quote.');
  }

  const plan = planInvoice({
    request: input.kind,
    quoteLines: currentQuote.items as unknown as BillingLine[],
    depositPercent,
    missionName: mission.name,
    priorDeposits: invoices
      .filter((invoice) => invoice.invoiceKind === 'DEPOSIT')
      .map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber as string,
        subtotalCents: toCents(Number(invoice.subtotal)),
      })),
  });

  return { mission, currentQuote, plan };
}

export async function generateInvoice(
  db: PrismaClient,
  storage: StorageService,
  userId: string,
  input: GenerateInvoiceInput
) {
  const { mission } = await checkedInvoicePlan(db, userId, input);

  const providerId = issuerOf(mission);
  const { client, provider, settings, tvaRate, scope, missionId } = await loadDocumentContext(
    db,
    userId,
    mission.clientId,
    providerId,
    mission.spaceId,
    mission.id
  );

  return withDocumentNumber(db, scopeSpaceId(scope), 'invoice', async (invoiceNumber, tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Mission" WHERE "id" = ${mission.id} FOR UPDATE`;
    const { currentQuote, plan } = await checkedInvoicePlan(tx as unknown as PrismaClient, userId, input);
    const today = new Date();
    const party = buildPartyAndLegalData(client, provider, settings);
    const dueDate =
      input.dueDate ?? new Date(today.getTime() + (party.payment_terms_days ?? 30) * DAY_MS);
    const documentData = {
      type: 'facture_prestation' as const,
      invoice_title: INVOICE_TITLES[plan.kind],
      invoice_number: invoiceNumber,
      invoice_date: isoDay(today),
      due_date: isoDay(dueDate),
      quote_number: currentQuote.quoteNumber ?? '',
      clientId: client.id,
      providerId,
      ...party,
      items: plan.lines,
      tva_rate: tvaRate,
      railway_estimate: 0,
      providers: [],
      features: [],
      payment_providers: [],
    };

    const pdf = await generateDocumentWithLogo(documentData, provider.logoUrl, storage);
    const stored = await storeDocumentPdf(storage, pdf);
    const { subtotal, tva, total } = totalsOf(plan.lines, tvaRate);

    const document = await tx.document.create({
      data: {
        type: 'facture_prestation',
        name: `facture_prestation_${invoiceNumber}.pdf`,
        invoiceNumber,
        invoiceKind: plan.kind,
        sourceQuoteId: currentQuote.id,
        dueDate,
        ...buildDocumentPersistenceBase(
          documentData as DocumentData,
          providerId,
          pdf.length,
          userId,
          buildDocumentLegalPersistence(client, provider, settings),
          scope,
          missionId,
          stored
        ),
        items: plan.lines as unknown as Prisma.InputJsonValue,
        subtotal,
        tva,
        total,
        tvaRate,
        railwayEstimate: 0,
      },
    });

    await tx.mission.updateMany({
      where: { id: mission.id, status: 'ACCEPTED' },
      data: { status: 'INVOICED' },
    });

    return document;
  });
}
