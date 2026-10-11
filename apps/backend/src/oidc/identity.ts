import type { PrismaClient } from '@repo/types';
import {
  loginBlockReason,
  loginGateSelection,
  sessionUserSelection,
  toSessionUser,
} from '@repo/trpc/auth/session';
import type { OidcClaims } from './flow';

export type IdentityFailure = 'not_invited' | 'email_unverified' | 'identity_conflict' | 'blocked';

export class IdentityError extends Error {
  constructor(readonly code: IdentityFailure) {
    super(code);
  }
}

const userSelect = { ...sessionUserSelection, ...loginGateSelection } as const;

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
    if (!user) throw new IdentityError('not_invited');

    const other = await db.account.findFirst({
      where: { userId: user.id, providerId: issuer },
      select: { id: true },
    });
    if (other) throw new IdentityError('identity_conflict');
  }

  if (loginBlockReason(user)) throw new IdentityError('blocked');

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
    data: {
      emailVerified: true,
      lastLoginAt: new Date(),
      ...(claims.givenName || claims.familyName
        ? { firstName: claims.givenName ?? user.firstName, lastName: claims.familyName ?? user.lastName }
        : {}),
    },
    select: sessionUserSelection,
  });

  return toSessionUser(updated);
}
