export type {
  User,
  Session,
  Verification,
  Media,
  Prisma,
  PrismaClient,
  Client,
  Payment,
  Settings,
  Document,
  Provider,
  Space,
  SpaceMember,
} from '@repo/database';

export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT',
}

export enum SpaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}
