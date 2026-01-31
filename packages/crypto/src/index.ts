import crypto from 'crypto';
import { hash as argon2Hash, verify as argon2Verify } from 'argon2';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

class CryptoService {
  private key: Buffer;

  constructor() {
    if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY required');
    this.key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();
  }

  public encrypt = (text: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  };

  public decrypt = (data: string): string => {
    const buf = Buffer.from(data, 'base64');

    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const enc = buf.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(enc, undefined, 'utf8') + decipher.final('utf8');
  };

  public hash = {
    light: (data: string): string => crypto.createHash('sha256').update(data, 'utf8').digest('hex'),

    heavy: async (data: string): Promise<string> => await argon2Hash(data),
  };

  public verify = {
    light: (hash: string, data: string): boolean => {
      try {
        const h1 = Buffer.from(hash, 'hex');
        const h2 = Buffer.from(
          crypto.createHash('sha256').update(data, 'utf8').digest('hex'),
          'hex'
        );
        return h1.length === h2.length && crypto.timingSafeEqual(h1, h2);
      } catch {
        return false;
      }
    },

    heavy: async (hash: string, data: string): Promise<boolean> => await argon2Verify(hash, data),
  };

  public object = {
    encrypt: <T>(data: T): string => this.encrypt(JSON.stringify(data)),
    decrypt: <T>(data: string): T => {
      try {
        return JSON.parse(this.decrypt(data)) as T;
      } catch {
        throw new Error('Invalid encrypted data');
      }
    },
  };
}

export default new CryptoService();
