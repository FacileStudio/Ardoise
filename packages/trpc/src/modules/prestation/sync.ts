import type { PrismaClient } from '@repo/database';
import { logger } from '@repo/logger';

// a prestation is paid once every invoice it holds has a paid payment
export async function syncPrestationPaid(db: PrismaClient, prestationId: string | null) {
  if (!prestationId) return;

  try {
    const invoices = await db.document.findMany({
      where: { prestationId, invoiceNumber: { not: null } },
      select: { id: true },
    });

    if (invoices.length === 0) return;

    const paid = await db.payment.findMany({
      where: { prestationId, status: 'PAID', documentId: { in: invoices.map((i) => i.id) } },
      select: { documentId: true },
    });
    const paidIds = new Set(paid.map((p) => p.documentId));

    if (!invoices.every((invoice) => paidIds.has(invoice.id))) return;

    await db.prestation.updateMany({
      where: { id: prestationId, status: 'INVOICED' },
      data: { status: 'PAID' },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to sync prestation status after payment');
  }
}
