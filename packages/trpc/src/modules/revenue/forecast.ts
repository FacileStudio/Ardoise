import { Prisma } from '@repo/database';
import type { PrismaClient } from '@repo/database';
import { decimal, format, sum, type Money } from './money';
import { monthRange, parisMonth } from './months';
import { LIVE_STATUSES, OPEN_STATUSES, clock, hasStatus, inSpaces, parisOf } from './sql';
import { overdueSql } from './to-collect';
import { FORECAST_SOURCES, type ForecastSource, type RevenueOverview } from './types';

const HORIZON = 12;

interface ForecastRow {
  source: ForecastSource;
  month: string | null;
  amount: unknown;
}

/**
 * Open payments that are not late yet, at their due date.
 */
const scheduledSql = (spaceIds: string[], now: Date) => Prisma.sql`
  SELECT 'scheduled' AS source, ${parisOf(Prisma.sql`p."dueDate"`)} AS at, p.amount AS amount
  FROM "Payment" p
  WHERE ${inSpaces(Prisma.sql`p."spaceId"`, spaceIds)}
    AND ${hasStatus(Prisma.sql`p.status`, OPEN_STATUSES)}
    AND NOT ${overdueSql(now)}
`;

/**
 * Renewals of active subscriptions: a PAID Stripe payment that repeats every month or year,
 * counted from its last payment date, only inside the horizon.
 */
const recurringSql = (spaceIds: string[], now: Date) => {
  const { nowLocal, monthStart } = clock(now);

  return Prisma.sql`
    SELECT 'recurring' AS source, renewal.at AS at, renewal.amount AS amount
    FROM (
      SELECT ${parisOf(Prisma.sql`p."paidAt"`)} + n * (
          CASE p.frequency::text WHEN 'MONTHLY' THEN interval '1 month' ELSE interval '1 year' END
        ) AS at,
        p.amount AS amount
      FROM "Payment" p
      CROSS JOIN LATERAL generate_series(
        1, CASE p.frequency::text WHEN 'MONTHLY' THEN 120 ELSE 10 END
      ) AS n
      WHERE ${inSpaces(Prisma.sql`p."spaceId"`, spaceIds)}
        AND p.status::text = 'PAID'
        AND p."paidAt" IS NOT NULL
        AND p.frequency::text IN ('MONTHLY', 'YEARLY')
        AND p."collectionMethod"::text = 'STRIPE'
    ) renewal
    WHERE renewal.at > ${nowLocal}
      AND renewal.at < ${monthStart} + interval '12 months'
  `;
};

/**
 * Accepted work not invoiced yet: per mission, the latest quote when it is accepted, minus
 * every invoice of the mission and every payment on it that has no invoice. Dated by the
 * quote's dueDate, clamped to the current month when that date has passed.
 */
const unbilledSql = (spaceIds: string[], now: Date) => {
  const { nowLocal } = clock(now);

  return Prisma.sql`
    SELECT 'unbilled' AS source,
      CASE WHEN q."dueDate" IS NULL THEN NULL
        ELSE GREATEST(${parisOf(Prisma.sql`q."dueDate"`)}, ${nowLocal}) END AS at,
      q.total - COALESCE(invoiced.amount, 0) - COALESCE(paid.amount, 0) AS amount
    FROM (
      SELECT DISTINCT ON (d."missionId") d."missionId", d."spaceId", d.total, d."dueDate", d."acceptedAt"
      FROM "Document" d
      WHERE d.type::text = 'devis'
        AND d."missionId" IS NOT NULL
        AND ${inSpaces(Prisma.sql`d."spaceId"`, spaceIds)}
      ORDER BY d."missionId", d.version DESC NULLS LAST, d."createdAt" DESC
    ) q
    JOIN "Mission" m ON m.id = q."missionId" AND m."spaceId" = q."spaceId"
    LEFT JOIN LATERAL (
      SELECT SUM(i.total) AS amount FROM "Document" i
      WHERE i."missionId" = q."missionId" AND i."spaceId" = q."spaceId"
        AND i.type::text = 'facture_prestation' AND i."invoiceNumber" IS NOT NULL
    ) invoiced ON true
    LEFT JOIN LATERAL (
      SELECT SUM(p.amount) AS amount FROM "Payment" p
      WHERE p."missionId" = q."missionId" AND p."spaceId" = q."spaceId"
        AND p."documentId" IS NULL AND ${hasStatus(Prisma.sql`p.status`, LIVE_STATUSES)}
    ) paid ON true
    WHERE q."acceptedAt" IS NOT NULL
      AND m.status::text NOT IN ('CANCELLED', 'PAID')
      AND q.total - COALESCE(invoiced.amount, 0) - COALESCE(paid.amount, 0) > 0
  `;
};

/**
 * Invoices issued but never put on a live payment, due at their dueDate (or the payment term
 * after creation), clamped to the current month when that date has passed.
 */
const invoicedSql = (spaceIds: string[], now: Date) => {
  const { nowLocal } = clock(now);
  const due = Prisma.sql`COALESCE(d."dueDate", d."createdAt" + d."paymentTermsDays" * interval '1 day')`;

  return Prisma.sql`
    SELECT 'invoiced' AS source, GREATEST(${parisOf(due)}, ${nowLocal}) AS at, d.total AS amount
    FROM "Document" d
    LEFT JOIN "Mission" m ON m.id = d."missionId"
    WHERE d.type::text = 'facture_prestation'
      AND d."invoiceNumber" IS NOT NULL
      AND ${inSpaces(Prisma.sql`d."spaceId"`, spaceIds)}
      AND (m.id IS NULL OR m.status::text <> 'CANCELLED')
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

export function forecastRows(db: PrismaClient, spaceIds: string[], now: Date) {
  return db.$queryRaw<ForecastRow[]>(Prisma.sql`
    SELECT f.source, to_char(f.at, 'YYYY-MM') AS month, SUM(f.amount) AS amount
    FROM (
      ${scheduledSql(spaceIds, now)}
      UNION ALL ${recurringSql(spaceIds, now)}
      UNION ALL ${unbilledSql(spaceIds, now)}
      UNION ALL ${invoicedSql(spaceIds, now)}
    ) f
    GROUP BY 1, 2
  `);
}

function totalsOf(rows: ForecastRow[], source: ForecastSource, months: string[]) {
  const mine = rows.filter((row) => row.source === source);
  const at = (month: string) =>
    sum(mine.filter((row) => row.month === month).map((r) => decimal(r.amount)));
  const dated = months.map((month) => ({ month, value: at(month) }));
  const undated = sum(mine.filter((row) => row.month === null).map((r) => decimal(r.amount)));
  const later = sum(
    mine
      .filter((row) => row.month !== null && !months.includes(row.month))
      .map((r) => decimal(r.amount))
  );
  const total: Money = sum([...dated.map((d) => d.value), undated, later]);

  return {
    months: dated.map(({ month, value }) => ({ month, amount: format(value) })),
    undated: format(undated),
    later: format(later),
    total: format(total),
  };
}

export function forecastOverview(rows: ForecastRow[], now: Date): RevenueOverview['forecast'] {
  const months = monthRange(parisMonth(now), HORIZON);
  const sources = Object.fromEntries(
    FORECAST_SOURCES.map((source) => [source, totalsOf(rows, source, months)])
  ) as RevenueOverview['forecast']['sources'];
  const total = sum(FORECAST_SOURCES.map((source) => decimal(sources[source].total)));

  return { months, sources, total: format(total) };
}
