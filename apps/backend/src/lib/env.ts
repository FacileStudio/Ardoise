import { serverEnvSchema } from '@repo/env';
import { ZodError } from 'zod';

let env: ReturnType<typeof serverEnvSchema.parse>;

try {
  env = serverEnvSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');

  if (error instanceof ZodError) {
    console.error('\nMissing or invalid environment variables:');
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  } else if (error instanceof Error) {
    console.error(error.message);
  }

  console.error('\nPlease check your environment variables configuration.');
  console.error('See apps/backend/.env.example for required variables.\n');
  process.exit(1);
}

export { env };
export default env;
