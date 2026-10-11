import { SignJWT, jwtVerify } from 'jose';
import { CryptoService } from '@repo/crypto';
import { UserRole } from '@repo/types';

export interface TokenUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthConfig {
  encryptionSecret: string;
  issuer?: string;
  audience?: string;
  tokenExpiration?: string;
  refreshTokenExpiration?: string;
}

export class AuthManager {
  private readonly secret: Uint8Array;
  private readonly crypto: CryptoService;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly tokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor(config: AuthConfig) {
    this.secret = new TextEncoder().encode(config.encryptionSecret);

    this.crypto = new CryptoService({ ENCRYPTION_KEY: config.encryptionSecret });

    this.issuer = config.issuer ?? 'maxi-boilerplate-api';
    this.audience = config.audience ?? 'maxi-boilerplate-client';
    this.tokenExpiration = config.tokenExpiration ?? '15m';
    this.refreshTokenExpiration = config.refreshTokenExpiration ?? '7d';
  }

  async createToken(user: TokenUser): Promise<string> {
    return await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setExpirationTime(this.tokenExpiration)
      .sign(this.secret);
  }

  async createRefreshToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const token = await new SignJWT({
      sub: userId,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(crypto.randomUUID())
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setExpirationTime(this.refreshTokenExpiration)
      .sign(this.secret);

    return { token, expiresAt };
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      });

      if (payload.type !== 'refresh' || !payload.sub) {
        return null;
      }

      return { userId: payload.sub };
    } catch {
      return null;
    }
  }

  async verifyToken(token: string): Promise<TokenUser | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      });

      const role = payload.role as string;
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return null;
      }

      return {
        id: payload.id as string,
        email: payload.email as string,
        role: role as UserRole,
      };
    } catch (error) {
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
