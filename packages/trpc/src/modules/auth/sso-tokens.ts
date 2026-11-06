import { CryptoService } from '@repo/crypto';
import type { SubjectTokens, SubjectTokenStore } from '@repo/nuage';
import type { PrismaClient } from '@repo/types';

export interface SsoTokenGrant {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

const REFRESH_LIFETIME_MS = 30 * 24 * 3600 * 1000;

const encryptor = (secret: string) => new CryptoService({ ENCRYPTION_KEY: secret });

function open(crypto: CryptoService, value: string | null): string | null {
  if (!value) return null;
  try {
    return crypto.decrypt(value);
  } catch {
    return null;
  }
}

/**
 * Keeps the Registre tokens of a Facile SSO sign-in on the user's `Account`
 * row, sealed with ENCRYPTION_SECRET. Ardoise needs them to act for the user at
 * Nuage after the browser session is gone. A sign-in that returns no refresh
 * token leaves the row as it was.
 */
export async function saveSsoTokens(
  db: PrismaClient,
  issuer: string,
  subject: string,
  grant: SsoTokenGrant,
  secret: string
): Promise<void> {
  if (!grant.accessToken || !grant.refreshToken) return;
  const crypto = encryptor(secret);
  await db.account.updateMany({
    where: { providerId: issuer, accountId: subject },
    data: {
      accessToken: crypto.encrypt(grant.accessToken),
      refreshToken: crypto.encrypt(grant.refreshToken),
      accessTokenExpiresAt: new Date(Date.now() + (grant.expiresIn ?? 0) * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + REFRESH_LIFETIME_MS),
    },
  });
}

/** Forgets the stored Registre session of a user, as a local logout must. */
export async function clearSsoTokens(db: PrismaClient, issuer: string, userId: string): Promise<void> {
  await db.account.updateMany({
    where: { userId, providerId: issuer },
    data: { accessToken: null, refreshToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null },
  });
}

/** The token store `@repo/nuage` reads and rotates through, over the SSO `Account` row. */
export function accountTokenStore(db: PrismaClient, issuer: string, secret: string): SubjectTokenStore {
  const crypto = encryptor(secret);
  return {
    async load(userId: string): Promise<SubjectTokens | null> {
      const account = await db.account.findFirst({
        where: { userId, providerId: issuer },
        select: { accessToken: true, refreshToken: true, accessTokenExpiresAt: true, refreshTokenExpiresAt: true },
      });
      if (!account) return null;
      return {
        accessToken: open(crypto, account.accessToken),
        refreshToken: open(crypto, account.refreshToken),
        expiresAt: account.accessTokenExpiresAt,
        refreshExpiresAt: account.refreshTokenExpiresAt,
      };
    },
    async save(userId: string, tokens: SubjectTokens): Promise<void> {
      await db.account.updateMany({
        where: { userId, providerId: issuer },
        data: {
          accessToken: tokens.accessToken ? crypto.encrypt(tokens.accessToken) : null,
          refreshToken: tokens.refreshToken ? crypto.encrypt(tokens.refreshToken) : null,
          accessTokenExpiresAt: tokens.expiresAt,
          refreshTokenExpiresAt: tokens.refreshExpiresAt ?? null,
        },
      });
    },
  };
}
