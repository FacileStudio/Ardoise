import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@repo/trpc';
import type { EntityConfig } from '@repo/admin';

type RouterOutput = inferRouterOutputs<AppRouter>;

export type SessionUser = RouterOutput['auth']['me'];
export type ClientDetail = RouterOutput['client']['getById'];
export type ProviderDetail = RouterOutput['provider']['get'];
export type AdminEntityConfig = Omit<EntityConfig, 'schema'>;
export type AdminEntityItem = Record<string, unknown>;
