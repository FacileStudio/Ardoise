import { Prisma } from '@repo/database';
import { scopeWhere, type Scope } from '../space/service';

export const TIME_ZONE = 'Europe/Paris';

/**
 * Statuses that still owe money. PROCESSING and AWAITING_CONFIRMATION come with
 * the client payments migration (PR #29). They are matched by name as text, so
 * this runs on a schema that does not have them yet and picks them up once it does.
 */
export const OPEN_STATUSES: string[] = [
  'PENDING',
  'PROCESSING',
  'AWAITING_CONFIRMATION',
  'PAST_DUE',
];

export const LIVE_STATUSES: string[] = [...OPEN_STATUSES, 'PAID'];

export function spaceIdsOf(scope: Scope): string[] {
  const { spaceId } = scopeWhere(scope);
  return typeof spaceId === 'string' ? [spaceId] : spaceId.in;
}

export const parisOf = (column: Prisma.Sql) =>
  Prisma.sql`((${column} AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris')`;

export function clock(now: Date) {
  const nowLocal = Prisma.sql`(${now.toISOString()}::timestamptz AT TIME ZONE 'Europe/Paris')`;

  return {
    nowLocal,
    monthStart: Prisma.sql`date_trunc('month', ${nowLocal})`,
    dayStart: Prisma.sql`date_trunc('day', ${nowLocal})`,
  };
}

export const inSpaces = (column: Prisma.Sql, spaceIds: string[]) =>
  Prisma.sql`${column} = ANY(${spaceIds}::text[])`;

export const hasStatus = (column: Prisma.Sql, statuses: string[]) =>
  Prisma.sql`${column}::text = ANY(${statuses}::text[])`;
