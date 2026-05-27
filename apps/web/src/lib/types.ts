import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@repo/trpc';

type RouterOutput = inferRouterOutputs<AppRouter>;

export type User = RouterOutput['user']['list'][number];
export type UserDetail = RouterOutput['user']['getById'];
export type UserStats = RouterOutput['user']['getStats'];
export type SessionUser = RouterOutput['auth']['me'];
export type ClientDetail = RouterOutput['client']['getById'];
export type ProviderDetail = RouterOutput['provider']['get'];
