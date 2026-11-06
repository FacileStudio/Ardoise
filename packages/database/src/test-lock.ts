import pg from 'pg';

/** One advisory lock key for every DB test file of the monorepo. */
const TEST_DATABASE_LOCK = 726_111_001;

/**
 * Holds a session advisory lock on the test database until the returned
 * release runs, so DB test files never overlap, even across two `bun test`
 * runs (two agents, or trpc and backend at once) pointed at one database.
 * Without it they wipe each other's rows mid-test (Prisma P2025, timeouts).
 */
export async function lockTestDatabase(url: string): Promise<() => Promise<void>> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('SELECT pg_advisory_lock($1)', [TEST_DATABASE_LOCK]);
  return async () => {
    await client.query('SELECT pg_advisory_unlock($1)', [TEST_DATABASE_LOCK]).catch(() => {});
    await client.end();
  };
}
