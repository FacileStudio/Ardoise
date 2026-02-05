import { logger as clientLogger } from './client.js';
import { logger as serverLogger } from './server.js';

const isBrowser = typeof window !== 'undefined';

export const logger = isBrowser ? clientLogger : serverLogger;

export type { Logger } from 'pino';
