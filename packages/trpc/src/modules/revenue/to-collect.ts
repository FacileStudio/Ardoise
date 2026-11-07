import { Prisma } from '@repo/database';
import type { PrismaClient } from '@repo/database';
import { decimal, format, sum } from './money';
import { unrequestedInvoicesSql } from './invoices';
import { OPEN_STATUSES, clock, hasStatus, inSpaces, parisOf } from './sql';
import type { OpenPaymentItem, RevenueOverview } from './types';

const LIST_LIMIT = 100;

interface TotalRow {
  overdue: boolean;
  amount: unknown;
  count: bigint | number;
}

interface InvoiceRow {
  late: string;
  amount: unknown;
  count: bigint | number;
}

interface ItemRow {
  id: string;
  amount: unknown;
  dueDate: Date;
  status: string;
  frequency: string;
  overdue: boolean;
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  missionId: string | null;
  missionName: string | null;
}

export function overdueSql(now: Date) {
  const { dayStart } = clock(now);

  return Prisma.sql`(p.status::text = 'PAST_DUE' OR ${parisOf(Prisma.sql`p."dueDate"`)} < ${dayStart})`;
}

const openWhere = (spaceIds: string[]) =>
  Prisma.sql`${inSpaces(Prisma.sql`p."spaceId"`, spaceIds)} AND ${hasStatus(Prisma.sql`p.status`, OPEN_STATUSES)}`;

export async function toCollectRows(db: PrismaClient, spaceIds: string[], now: Date) {
  const overdue = overdueSql(now);
  const { dayStart } = clock(now);

  const [invoices, totals, items] = await Promise.all([
    db.$queryRaw<InvoiceRow[]>(Prisma.sql`
      SELECT CASE WHEN i.due < ${dayStart} - interval '12 months' THEN 'very' ELSE 'overdue' END AS late,
        SUM(i.amount) AS amount, COUNT(*) AS count
      FROM (${unrequestedInvoicesSql(spaceIds)}) i
      WHERE i.due < ${dayStart}
      GROUP BY 1
    `),
    db.$queryRaw<TotalRow[]>(Prisma.sql`
      SELECT ${overdue} AS overdue, SUM(p.amount) AS amount, COUNT(*) AS count
      FROM "Payment" p
      WHERE ${openWhere(spaceIds)}
      GROUP BY 1
    `),
    db.$queryRaw<ItemRow[]>(Prisma.sql`
      SELECT p.id, p.amount, p."dueDate", p.status::text AS status, p.frequency::text AS frequency,
        ${overdue} AS overdue, c."companyName", c."contactFirstName", c."contactLastName",
        p."missionId", m.name AS "missionName"
      FROM "Payment" p
      JOIN "Client" c ON c.id = p."clientId"
      LEFT JOIN "Mission" m ON m.id = p."missionId"
      WHERE ${openWhere(spaceIds)}
      ORDER BY 6 DESC, p."dueDate" ASC, p.id ASC
      LIMIT ${LIST_LIMIT + 1}
    `),
  ]);

  return { totals, items, invoices };
}

const clientName = (row: ItemRow) =>
  row.companyName.trim() || `${row.contactFirstName} ${row.contactLastName}`.trim();

const itemOf = (row: ItemRow): OpenPaymentItem => ({
  id: row.id,
  amount: format(decimal(row.amount)),
  dueDate: row.dueDate.toISOString(),
  status: row.status,
  frequency: row.frequency,
  overdue: row.overdue,
  clientName: clientName(row),
  missionId: row.missionId,
  missionName: row.missionName,
});

export function toCollectOverview(
  rows: Awaited<ReturnType<typeof toCollectRows>>
): RevenueOverview['toCollect'] {
  const side = (overdue: boolean) => {
    const row = rows.totals.find((total) => total.overdue === overdue);
    return { amount: decimal(row?.amount), count: Number(row?.count ?? 0) };
  };
  const invoiceSide = (late: string) => {
    const row = rows.invoices.find((invoice) => invoice.late === late);
    return { amount: decimal(row?.amount), count: Number(row?.count ?? 0) };
  };
  const payments = side(true);
  const invoices = invoiceSide('overdue');
  const veryLate = invoiceSide('very');
  const coming = side(false);
  const overdue = {
    amount: sum([payments.amount, invoices.amount]),
    count: payments.count + invoices.count,
  };

  return {
    overdue: { amount: format(overdue.amount), count: overdue.count },
    overdueInvoices: { amount: format(invoices.amount), count: invoices.count },
    veryLate: { amount: format(veryLate.amount), count: veryLate.count },
    upcoming: { amount: format(coming.amount), count: coming.count },
    total: format(sum([overdue.amount, coming.amount])),
    items: rows.items.slice(0, LIST_LIMIT).map(itemOf),
    truncated: rows.items.length > LIST_LIMIT,
  };
}
