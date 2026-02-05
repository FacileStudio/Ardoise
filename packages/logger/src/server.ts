import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

const redactPaths = [
  'password',
  'token',
  'secret',
  'authorization',
  'user.password',
  'user.email',
  'card.number',
  'card.cvv',
  'stripe.secret',
  '*.password',
  '*.token',
  '*.secret',
];

let transport;

if (isProd && process.env.LOGTAIL_TOKEN) {
  transport = pino.transport({
    target: '@logtail/pino',
    options: { sourceToken: process.env.LOGTAIL_TOKEN },
  });
} else if (!isProd) {
  transport = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  });
}

export const logger = pino(
  {
    level: logLevel,
    redact: {
      paths: redactPaths,
      remove: true,
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

export type Logger = typeof logger;
