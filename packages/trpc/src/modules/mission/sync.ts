import type { PrismaClient } from '@repo/database';
import { logger } from '@repo/logger';

// a mission is paid once every invoice it holds has a paid payment
export async function syncMissionPaid(db: PrismaClient, missionId: string | null) {
  if (!missionId) return;

  try {
    const invoices = await db.document.findMany({
      where: { missionId, invoiceNumber: { not: null } },
      select: { id: true },
    });

    if (invoices.length === 0) return;

    const paid = await db.payment.findMany({
      where: { missionId, status: 'PAID', documentId: { in: invoices.map((i) => i.id) } },
      select: { documentId: true },
    });
    const paidIds = new Set(paid.map((p) => p.documentId));

    if (!invoices.every((invoice) => paidIds.has(invoice.id))) return;

    await db.mission.updateMany({
      where: { id: missionId, status: 'INVOICED' },
      data: { status: 'PAID' },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to sync mission status after payment');
  }
}
