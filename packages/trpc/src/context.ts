import { prisma } from '@repo/database';

type Logger = {
  info: (msg: any) => void;
  warn: (msg: any) => void;
  error: (msg: any) => void;
  debug: (msg: any) => void;
};

export const createContext = (logger?: Logger) => ({
  db: prisma,
  user: null as { id: string } | null,
  logger: logger || console,
});

export type Context = ReturnType<typeof createContext>;
