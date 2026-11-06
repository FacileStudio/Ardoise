import type { PrismaClient } from '@repo/types';
import {
  loginBlockReason,
  loginGateSelection,
  sessionUserSelection,
  toSessionUser,
} from '@repo/trpc/auth/session';
import type { OidcClaims } from './flow';

export type IdentityFailure = 'email_unverified' | 'identity_conflict' | 'blocked' | 'client_account';

export class IdentityError extends Error {
  constructor(readonly code: IdentityFailure) {
    super(code);
  }
}

const userSelect = { ...sessionUserSelection, ...loginGateSelection } as const;

/**
 * The profile Facile SSO owns: first and last name from the given and family
 * name claims, else split from `name`, else the email's local part, and the
 * picture URL when it is https. Registre sends `name` only, so the split is
 * the path that runs in production.
 */
export function ssoProfile(claims: OidcClaims) {
  const [first = '', ...rest] = (claims.name?.trim() || claims.email.split('@')[0] || '').split(/\s+/);
  return {
    firstName: claims.givenName ?? (claims.familyName ? '' : first),
    lastName: claims.familyName ?? (claims.givenName ? '' : rest.join(' ')),
    ssoPictureUrl: claims.picture?.startsWith('https://') ? claims.picture : null,
  };
}

/**
 * Resolves a Facile SSO sign-in to its Ardoise user: found by identity, then
 * by verified email, else created. Every sign-in sets the role to MEMBER,
 * which grants nothing by itself: the spaces a member works in come only from
 * Registre's directory (registre/spaces.ts), and platform powers only from
 * PLATFORM_STAFF_SUBS. A sign-in never yields ADMIN, and a legacy ADMIN row is
 * relabelled MEMBER. Name and picture are refreshed from SSO. Clients never
 * hold an SSO account; they sign in with magic links, so a CLIENT row is never
 * linked by email nor promoted, even when already linked: `client_account`.
 */
export async function resolveUser(db: PrismaClient, issuer: string, claims: OidcClaims) {
  const linked = await db.account.findUnique({
    where: { providerId_accountId: { providerId: issuer, accountId: claims.sub } },
    select: { user: { select: userSelect } },
  });

  let user = linked?.user ?? null;

  if (!user) {
    if (!claims.emailVerified) throw new IdentityError('email_unverified');

    user = await db.user.findFirst({
      where: { email: { equals: claims.email, mode: 'insensitive' } },
      select: userSelect,
    });

    if (user) {
      const other = await db.account.findFirst({
        where: { userId: user.id, providerId: issuer },
        select: { id: true },
      });
      if (other) throw new IdentityError('identity_conflict');
    }
  }

  if (user?.role === 'CLIENT') throw new IdentityError('client_account');
  if (user && loginBlockReason(user)) throw new IdentityError('blocked');

  const profile = ssoProfile(claims);
  const member = { ...profile, role: 'MEMBER' as const, emailVerified: true, lastLoginAt: new Date() };

  if (!user) {
    const created = await db.user.create({
      data: {
        email: claims.email,
        ...member,
        accounts: { create: { id: crypto.randomUUID(), providerId: issuer, accountId: claims.sub } },
      },
      select: sessionUserSelection,
    });
    return toSessionUser(created);
  }

  if (!linked) {
    const userId = user.id;
    await db.$transaction([
      db.account.create({
        data: { id: crypto.randomUUID(), userId, providerId: issuer, accountId: claims.sub },
      }),
      db.account.deleteMany({ where: { userId, providerId: 'oidc' } }),
    ]);
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: member,
    select: sessionUserSelection,
  });

  return toSessionUser(updated);
}
