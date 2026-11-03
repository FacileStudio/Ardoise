import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import type { ServerEnv } from '@repo/env';

/**
 * Registre owns shared spaces once SSO is configured: a linked space's name,
 * members, roles, leaving and deletion are managed there and Ardoise only
 * mirrors them. Description and everything the space scopes stay local.
 */

/** Registre's spaces page, or null when SSO is not configured. */
export function registreSpacesUrl(env: ServerEnv): string | null {
  return env.OIDC_ISSUER ? `${env.OIDC_ISSUER.replace(/\/$/, '')}/spaces` : null;
}

/** Where to manage one space, or null for an unlinked one. */
export function manageUrl(env: ServerEnv, registreSpaceId: string | null): string | null {
  const spaces = registreSpacesUrl(env);
  return spaces && registreSpaceId ? `${spaces}/${registreSpaceId}` : null;
}

/** Refuses with 409 because the action belongs to Registre. */
function managedInRegistre(url: string): never {
  throw new TRPCError({ code: 'CONFLICT', message: `This space is managed in Registre: ${url}` });
}

/** Refuses creating a space while Registre owns spaces. */
export function refuseCreateWhenManaged(env: ServerEnv): void {
  const spaces = registreSpacesUrl(env);
  if (spaces) managedInRegistre(spaces);
}

/**
 * Refuses a membership, invitation, leave, delete or rename action on a space
 * linked to Registre. `rename` is the requested name, refused only when it
 * differs from the current one.
 */
export async function refuseWhenLinked(
  db: PrismaClient,
  env: ServerEnv,
  spaceId: string,
  rename?: string
): Promise<void> {
  const space = await db.space.findUnique({
    where: { id: spaceId },
    select: { name: true, registreSpaceId: true },
  });
  const url = manageUrl(env, space?.registreSpaceId ?? null);
  if (!url || (rename !== undefined && rename === space?.name)) return;
  managedInRegistre(url);
}
