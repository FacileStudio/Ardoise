import pino from 'pino';

type PinoLogObject = {
  msg?: string;
  level: number;
  time: number;
  [key: string]: any;
};

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  browser: {
    asObject: true,
    write: {
      info: (o) => {
        const obj = o as PinoLogObject;
        console.log(obj.msg, obj);
      },
      error: (o) => {
        const obj = o as PinoLogObject;
        console.error(obj.msg, obj);
      },
      warn: (o) => {
        const obj = o as PinoLogObject;
        console.warn(obj.msg, obj);
      },
      debug: (o) => {
        if (isDev) {
          const obj = o as PinoLogObject;
          console.debug(obj.msg, obj);
        }
      },
    },
  },
});
