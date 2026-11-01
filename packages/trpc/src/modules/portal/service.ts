import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import type { PlumeEnv } from '@repo/plume';
import { ensureClientSignUrl } from '../document/sign-link';
import { toBillingLines, toCents, totalsOf } from '../mission/billing-math';
import { parseStorageKey, mediaService } from '../media/service';
import type {
  ActionRequired,
  PortalDocument,
  PortalDocumentsInput,
  PortalMission,
  PortalOverview,
  SignatureStatus,
} from './types';

export const CLIENT_VISIBLE_TYPES = [
  'devis',
  'facture_prestation',
  'appel_de_fonds',
  'contrat_prestation',
  'contrat_maintenance',
  'back_contractuel',
  'maintenance',
] as const;

const DEFAULT_TVA_RATE = 20;
const OPEN_STATUSES = ['PENDING', 'PAST_DUE'] as const;
const BILLED_STATUSES = ['PENDING', 'PAST_DUE', 'PAID'] as const;

type Db = PrismaClient;
type ClientRow = NonNullable<Awaited<ReturnType<Db['client']['findUnique']>>>;

const notFound = (what: string) => new TRPCError({ code: 'NOT_FOUND', message: `${what} not found` });

async function requireClient(db: Db, userId: string): Promise<ClientRow> {
  const client = await db.client.findUnique({ where: { userId } });
  if (!client) throw notFound('Client');
  return client;
}

function documentScope(client: ClientRow) {
  return {
    spaceId: client.spaceId,
    type: { in: [...CLIENT_VISIBLE_TYPES] },
    OR: [
      { mission: { clientId: client.id } },
      { payments: { some: { clientId: client.id } } },
      { paymentAttachments: { some: { payment: { clientId: client.id } } } },
    ],
  };
}

const cents = (value: unknown) => toCents(Number(value));
const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

function documentNumber(row: {
  invoiceNumber: string | null;
  quoteNumber: string | null;
  contractRef: string | null;
}) {
  return row.invoiceNumber ?? row.quoteNumber ?? row.contractRef ?? null;
}

function toPortalDocument(row: any): PortalDocument {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    typeLabelKey: `portal.documentTypes.${row.type}`,
    missionId: row.missionId ?? null,
    missionName: row.mission?.name ?? null,
    number: documentNumber(row),
    issuedAt: (row.issuedAt ?? row.createdAt).toISOString(),
    total: row.total == null ? null : Number(row.total),
    signatureStatus: row.signatureStatus as SignatureStatus,
    signedAt: iso(row.signedAt),
    canDownload: !!row.pdfUrl,
    source: row.source === 'imported' ? 'imported' : 'generated',
  };
}

function missionPrice(mission: { prestations: any[]; providers: any[] }): number {
  const lead =
    mission.providers.find((link) => link.role === 'LEAD')?.provider ??
    mission.providers[0]?.provider;
  const rate = Number(lead?.tvaRate || DEFAULT_TVA_RATE);
  return totalsOf(toBillingLines(mission.prestations), rate).total;
}

function summarizeMission(mission: any, documents: any[], payments: any[]): PortalMission {
  const price = missionPrice(mission);
  const paidCents = payments
    .filter((payment) => payment.status === 'PAID')
    .reduce((sum, payment) => sum + cents(payment.amount), 0);
  const upcoming = payments
    .filter((payment) => (OPEN_STATUSES as readonly string[]).includes(payment.status))
    .map((payment) => payment.dueDate as Date)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    id: mission.id,
    name: mission.name,
    status: mission.status,
    description: mission.description ?? null,
    price,
    paid: paidCents / 100,
    due: Math.max(toCents(price) - paidCents, 0) / 100,
    nextDueDate: iso(upcoming[0]),
    documentCount: documents.length,
    pendingSignatureCount: documents.filter((doc) => doc.signatureStatus === 'sent').length,
  };
}

export function summarizeTotals(payments: any[], now: Date) {
  let billed = 0;
  let paid = 0;
  let due = 0;
  let overdue = 0;

  for (const payment of payments) {
    if (!(BILLED_STATUSES as readonly string[]).includes(payment.status)) continue;
    const amount = cents(payment.amount);
    billed += amount;
    if (payment.status === 'PAID') {
      paid += amount;
      continue;
    }
    due += amount;
    if (payment.status === 'PAST_DUE' || payment.dueDate.getTime() < now.getTime()) {
      overdue += amount;
    }
  }

  return {
    billed: billed / 100,
    paid: paid / 100,
    due: due / 100,
    overdue: overdue / 100,
    currency: 'EUR' as const,
  };
}

async function overview(db: Db, userId: string, now = new Date()): Promise<PortalOverview> {
  const client = await requireClient(db, userId);

  const [missions, payments, documents] = await Promise.all([
    db.mission.findMany({
      where: { clientId: client.id, spaceId: client.spaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        prestations: { orderBy: { position: 'asc' } },
        providers: { include: { provider: { select: { tvaRate: true } } } },
      },
    }),
    db.payment.findMany({
      where: { clientId: client.id, spaceId: client.spaceId },
      orderBy: { dueDate: 'asc' },
    }),
    db.document.findMany({
      where: documentScope(client),
      orderBy: { createdAt: 'desc' },
      include: { mission: { select: { name: true } } },
    }),
  ]);

  const summaries = missions.map((mission) =>
    summarizeMission(
      mission,
      documents.filter((doc) => doc.missionId === mission.id),
      payments.filter((payment) => payment.missionId === mission.id)
    )
  );

  const toPay: ActionRequired[] = payments
    .filter(
      (payment) =>
        payment.collectionMethod === 'STRIPE' &&
        (OPEN_STATUSES as readonly string[]).includes(payment.status)
    )
    .map((payment) => ({
      kind: 'pay' as const,
      paymentId: payment.id,
      description: payment.description,
      amount: Number(payment.amount),
      dueDate: payment.dueDate.toISOString(),
      overdue: payment.status === 'PAST_DUE' || payment.dueDate.getTime() < now.getTime(),
    }));

  const toSign: ActionRequired[] = documents
    .filter((doc) => doc.signatureStatus === 'sent')
    .map((doc) => ({
      kind: 'sign' as const,
      documentId: doc.id,
      name: doc.name,
      missionName: doc.mission?.name ?? null,
    }));

  return {
    client: {
      id: client.id,
      companyName: client.companyName,
      contactFirstName: client.contactFirstName,
      contactLastName: client.contactLastName,
    },
    totals: summarizeTotals(payments, now),
    missions: summaries,
    actionRequired: [...toPay, ...toSign],
  };
}

async function listDocuments(
  db: Db,
  userId: string,
  input?: PortalDocumentsInput
): Promise<PortalDocument[]> {
  const client = await requireClient(db, userId);
  const scope = documentScope(client);

  if (input?.type && !(CLIENT_VISIBLE_TYPES as readonly string[]).includes(input.type)) {
    return [];
  }

  const rows = await db.document.findMany({
    where: {
      ...scope,
      ...(input?.type ? { type: input.type as (typeof CLIENT_VISIBLE_TYPES)[number] } : {}),
      ...(input?.missionId ? { missionId: input.missionId } : {}),
    },
    orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
    include: { mission: { select: { name: true } } },
  });

  return rows
    .map(toPortalDocument)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

async function findOwnDocument(db: Db, client: ClientRow, id: string) {
  const document = await db.document.findFirst({ where: { id, ...documentScope(client) } });
  if (!document) throw notFound('Document');
  return document;
}

async function documentDownload(
  db: Db,
  userId: string,
  id: string,
  origin: string,
  secret: string
) {
  const client = await requireClient(db, userId);
  const document = await findOwnDocument(db, client, id);
  const key = parseStorageKey(document.pdfUrl);
  if (!key) throw notFound('File');
  return { url: mediaService.generateDownloadUrl(key, origin, secret) };
}

async function signLink(
  db: Db,
  userId: string,
  userEmail: string,
  id: string,
  env: PlumeEnv
) {
  const client = await requireClient(db, userId);
  const document = await findOwnDocument(db, client, id);

  if (document.signatureStatus !== 'sent') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This document is not waiting for a signature',
    });
  }
  const url = await ensureClientSignUrl({ db: db as PrismaClient, env }, document);
  if (!url) throw notFound('Signature link');
  return { url };
}

export const portalService = { overview, listDocuments, documentDownload, signLink };
export default portalService;
