import { Syncer, type ImportSpace, type Snapshot, type SyncLogger } from './directory';

/** The pieces the boot sequence talks to, faked in tests. */
export interface DirectoryRemote {
  import(spaces: ImportSpace[]): Promise<Snapshot>;
  snapshot(): Promise<Snapshot>;
}

/** How the import retries while Registre is unreachable. */
export interface ImportRetry {
  initialMs: number;
  maxMs: number;
  sleep: (ms: number) => Promise<void>;
}

const defaultRetry: ImportRetry = {
  initialMs: 15_000,
  maxMs: 5 * 60_000,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Imports Ardoise's spaces into Registre, retrying with backoff capped at five
 * minutes, and only then starts the syncer, so no sync can remove anyone
 * before Ardoise's own spaces are in Registre. Nudges before that are ignored.
 * `ready` settles after the first pull.
 */
export function startDirectorySync(options: {
  remote: DirectoryRemote;
  collect: () => Promise<ImportSpace[]>;
  apply: (snapshot: Snapshot) => Promise<void>;
  logger: SyncLogger;
  retry?: ImportRetry;
  interval?: number;
}): { syncer: Syncer; ready: Promise<void> } {
  const retry = options.retry ?? defaultRetry;
  const syncer = new Syncer(options.remote, options.apply, options.logger, options.interval);
  const ready = (async () => {
    let delay = retry.initialMs;
    for (let attempt = 1; ; attempt++) {
      try {
        await options.remote.import(await options.collect());
        break;
      } catch (error) {
        options.logger.warn({ error, attempt, retryInMs: delay }, '[REGISTRE] Space import failed, retrying');
        await retry.sleep(delay);
        delay = Math.min(delay * 2, retry.maxMs);
      }
    }
    await syncer.run();
  })();
  return { syncer, ready };
}
