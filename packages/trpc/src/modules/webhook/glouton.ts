import type { PrismaClient } from '@repo/database';
import type { Logger } from '@repo/logger';
import type { ServerEnv } from '@repo/env';
import {
  companyUrl,
  emit,
  gloutonConfigFromEnv,
  toCents,
  toClientPayload,
  type GloutonEvent,
} from '@repo/glouton';

type SyncContext = {
  db: PrismaClient;
  log: Logger;
  env: Partial<
    Pick<ServerEnv, 'FRONTEND_URL' | 'GLOUTON_URL' | 'GLOUTON_API_TOKEN' | 'GLOUTON_WEBHOOK_SECRET'>
  >;
};

type MissionEvent = Extract<GloutonEvent, `mission.${string}`>;

type MissionMoney = {
  amount?: { toString(): string } | number | null;
  documentNumber?: string | null;
};

export const gloutonClientInclude = { space: { select: { registreSpaceId: true } } } as const;

export function gloutonCompanyLink(env: SyncContext['env'], gloutonCompanyId: string | null) {
  const config = gloutonConfigFromEnv(env);
  return config && gloutonCompanyId ? companyUrl(config, gloutonCompanyId) : null;
}

export function emitClientToGlouton(
  ctx: SyncContext,
  event: 'client.created' | 'client.updated',
  clientId: string
) {
  emit(
    gloutonConfigFromEnv(ctx.env),
    event,
    async () => {
      const client = await ctx.db.client.findUnique({
        where: { id: clientId },
        include: gloutonClientInclude,
      });
      return client ? toClientPayload(client) : null;
    },
    { log: ctx.log }
  );
}

export function emitClientDeletedToGlouton(
  ctx: SyncContext,
  client: { id: string; gloutonCompanyId: string | null }
) {
  emit(
    gloutonConfigFromEnv(ctx.env),
    'client.deleted',
    async () => ({ id: client.id, gloutonCompanyId: client.gloutonCompanyId }),
    { log: ctx.log }
  );
}

export function emitMissionToGlouton(
  ctx: SyncContext,
  event: MissionEvent,
  missionId: string,
  money: MissionMoney
) {
  emit(
    gloutonConfigFromEnv(ctx.env),
    event,
    async () => {
      const mission = await ctx.db.mission.findUnique({
        where: { id: missionId },
        select: { id: true, name: true, clientId: true },
      });
      if (!mission) return null;
      const amountCents = toCents(money.amount);
      return {
        clientId: mission.clientId,
        missionId: mission.id,
        missionTitle: mission.name,
        ...(amountCents === undefined ? {} : { amountCents, currency: 'EUR' }),
        ...(money.documentNumber ? { documentNumber: money.documentNumber } : {}),
        ...(ctx.env.FRONTEND_URL
          ? { url: `${ctx.env.FRONTEND_URL}/admin/missions/${mission.id}` }
          : {}),
      };
    },
    { log: ctx.log }
  );
}
