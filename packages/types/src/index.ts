import {
  AccountEncryptedData,
  ContactEncryptedData,
  SessionEncryptedData,
  UserEncryptedData,
} from './encrypted';
import {
  User as PrismaUser,
  Session as PrismaSession,
  Contact as PrismaContact,
  Account as PrismaAccount,
} from '@repo/database';

export type {
  User as PrismaUser,
  Session as PrismaSession,
  Verification as PrismaVerification,
  Contact as PrismaContact,
  Prisma,
} from '@repo/database';
export * from './encrypted';

export interface User extends Omit<
  Omit<Omit<PrismaUser, 'encryptedData'>, 'hashedEmail'>,
  'hashedPassword'
> {
  data: UserEncryptedData;
}

export interface Account extends Omit<PrismaAccount, 'encryptedData'> {
  data: AccountEncryptedData;
}

export interface Session extends Omit<PrismaSession, 'encryptedData'> {
  data: SessionEncryptedData;
}

export interface Contact extends Omit<PrismaContact, 'encryptedData'> {
  data: ContactEncryptedData;
}
