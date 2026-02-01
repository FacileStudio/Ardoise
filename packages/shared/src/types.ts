import type {
  User as PrismaUser,
  Session as PrismaSession,
  Contact as PrismaContact,
} from '@repo/database';

export type User = PrismaUser;
export type Contact = PrismaContact;
export type Session = PrismaSession;

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export interface ContactFormInput {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}
