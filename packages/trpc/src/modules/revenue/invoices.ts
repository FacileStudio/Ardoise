import { Prisma } from '@repo/database';
import { LIVE_STATUSES, hasStatus, inSpaces, parisOf } from './sql';

/**
 * Invoices Ardoise issued that nobody has been asked to pay yet: no live or paid payment, by
 * document or by attachment. Imported documents, and invoices of PAID or CANCELLED missions, are
 * history rather than money to come.
 */
export const unrequestedInvoicesSql = (spaceIds: string[]) => {
  const due = Prisma.sql`COALESCE(d."dueDate", d."createdAt" + d."paymentTermsDays" * interval '1 day')`;

  return Prisma.sql`
    SELECT ${parisOf(due)} AS due, d.total AS amount
    FROM "Document" d
    LEFT JOIN "Mission" m ON m.id = d."missionId"
    WHERE d.type::text = 'facture_prestation'
      AND d."invoiceNumber" IS NOT NULL
      AND d.source::text <> 'imported'
      AND ${inSpaces(Prisma.sql`d."spaceId"`, spaceIds)}
      AND (m.id IS NULL OR m.status::text NOT IN ('CANCELLED', 'PAID'))
      AND NOT EXISTS (
        SELECT 1 FROM "Payment" p
        WHERE p."documentId" = d.id AND ${hasStatus(Prisma.sql`p.status`, LIVE_STATUSES)}
      )
      AND NOT EXISTS (
        SELECT 1 FROM "PaymentDocument" pd
        JOIN "Payment" p ON p.id = pd."paymentId"
        WHERE pd."documentId" = d.id AND ${hasStatus(Prisma.sql`p.status`, LIVE_STATUSES)}
      )
  `;
};
