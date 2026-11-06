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

/**
 * MEMBER is every Facile SSO user: what they reach comes only from their
 * space memberships. CLIENT is a portal account. ADMIN is legacy: nothing
 * assigns it any more and it grants exactly what MEMBER grants.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  CLIENT = 'CLIENT',
}

export enum SpaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}
