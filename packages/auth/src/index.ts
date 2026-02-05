import { SignJWT, jwtVerify } from 'jose';
import { type SessionUser } from '@repo/auth-shared';
import { CryptoService } from '@repo/crypto';

export interface AuthConfig {
  encryptionSecret: string;
  issuer?: string;
  audience?: string;
  tokenExpiration?: string;
}

export class AuthManager {
  private readonly secret: Uint8Array;
  private readonly crypto: CryptoService;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly tokenExpiration: string;

  constructor(config: AuthConfig) {
    this.secret = new TextEncoder().encode(config.encryptionSecret);

    this.crypto = new CryptoService({ ENCRYPTION_KEY: config.encryptionSecret });

    this.issuer = config.issuer ?? 'maxi-boilerplate-api';
    this.audience = config.audience ?? 'maxi-boilerplate-client';
    this.tokenExpiration = config.tokenExpiration ?? '7d';
  }

  async createToken(user: SessionUser): Promise<string> {
    return await new SignJWT({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isPremium: user.isPremium,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setExpirationTime(this.tokenExpiration)
      .sign(this.secret);
  }

  async verifyToken(token: string): Promise<SessionUser | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      });

      return {
        id: payload.id as string,
        email: payload.email as string,
        firstName: payload.firstName as string,
        lastName: payload.lastName as string,
        role: payload.role as any,
        isPremium: payload.isPremium as boolean,
        avatarUrl: payload.avatarUrl as string | null | undefined,
        coverImageUrl: payload.coverImageUrl as string | null | undefined,
      };
    } catch (error) {
      // Erreur de signature, expiration, etc.
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    return await this.crypto.hash.heavy(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await this.crypto.verify.heavy(hash, password);
  }

  encryptData(text: string): string {
    return this.crypto.encrypt(text);
  }

  decryptData(data: string): string {
    return this.crypto.decrypt(data);
  }
}

export type { SessionUser } from '@repo/auth-shared';
