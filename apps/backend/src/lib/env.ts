import { serverEnvSchema } from '@repo/env';

export const env = serverEnvSchema.parse(process.env);

export default env;
