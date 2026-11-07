import { Prisma } from '@repo/database';
import type { PrismaClient } from '@repo/database';
import { decimal, format, sum } from './money';
import { monthRange, parisMonth, shiftMonth } from './months';
import { clock, inSpaces, parisOf } from './sql';
import type { RevenueOverview } from './types';

interface MonthRow {
  month: string;
  amount: unknown;
}

const MONTHS = 12;

/**
 * Money received, by Paris month of the payment date. A subscription is one Payment row paid
 * again at every renewal, so each of its PAID invoices counts. The row itself counts too, unless a
 * paid invoice already covers its paidAt (within a day), which keeps a first period recorded only
 * on the row.
 */
export async function collectedRows(
  db: PrismaClient,
  spaceIds: string[],
  now: Date
): Promise<MonthRow[]> {
  const { monthStart } = clock(now);
  const paidAt = Prisma.sql`p."paidAt"`;
  const invoicePaidAt = Prisma.sql`i."paidAt"`;

  return db.$queryRaw<MonthRow[]>(Prisma.sql`
    SELECT to_char(received.at, 'YYYY-MM') AS month, SUM(received.amount) AS amount
    FROM (
      SELECT ${parisOf(paidAt)} AS at, p.amount AS amount
      FROM "Payment" p
      WHERE p.status::text = 'PAID'
        AND p."paidAt" IS NOT NULL
        AND ${inSpaces(Prisma.sql`p."spaceId"`, spaceIds)}
        AND NOT EXISTS (
          SELECT 1 FROM "PaymentInvoice" i
          WHERE i."paymentId" = p.id AND i.status::text = 'PAID' AND i."paidAt" IS NOT NULL
            AND abs(extract(epoch FROM (i."paidAt" - p."paidAt"))) < 86400
        )
      UNION ALL
      SELECT ${parisOf(invoicePaidAt)} AS at, i.amount AS amount
      FROM "PaymentInvoice" i
      JOIN "Payment" p ON p.id = i."paymentId"
      WHERE i.status::text = 'PAID'
        AND i."paidAt" IS NOT NULL
        AND ${inSpaces(Prisma.sql`p."spaceId"`, spaceIds)}
    ) received
    WHERE received.at >= ${monthStart} - interval '11 months'
      AND received.at < ${monthStart} + interval '1 month'
    GROUP BY 1
  `);
}

export function collectedOverview(rows: MonthRow[], now: Date): RevenueOverview['collected'] {
  const current = parisMonth(now);
  const byMonth = new Map(rows.map((row) => [row.month, decimal(row.amount)]));
  const months = monthRange(shiftMonth(current, -(MONTHS - 1)), MONTHS).map((month) => ({
    month,
    value: byMonth.get(month) ?? decimal(0),
  }));
  const year = current.slice(0, 4);

  return {
    thisMonth: format(byMonth.get(current) ?? decimal(0)),
    thisYear: format(sum(months.filter((m) => m.month.startsWith(year)).map((m) => m.value))),
    months: months.map(({ month, value }) => ({ month, amount: format(value) })),
  };
}
