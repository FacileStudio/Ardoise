import { User } from '@repo/database';

export type { Subscription, User, Session, Verification, Contact, Prisma } from '@repo/database';

export interface AuthState {
  user: User | undefined | null;
  session: any | undefined | null;
  loading: boolean;
}
