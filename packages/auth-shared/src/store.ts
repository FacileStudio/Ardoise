import { z } from 'zod';
import type { AuthState, SessionUser } from './';
import { sessionUserSchema } from './';
import { logger } from '@repo/logger';

// Lazy: index.ts's `export * from './store'` makes this a circular import,
// and building persistedStateSchema eagerly at module scope hit
// sessionUserSchema before index.ts finished initializing it (TDZ crash
// under Vite's SSR build, not caught by tsc). Deferring construction to
// first use sidesteps the circular-init ordering entirely.
let _persistedStateSchema: ReturnType<typeof buildPersistedStateSchema> | undefined;
function buildPersistedStateSchema() {
  return z.object({
    user: sessionUserSchema.nullable(),
    session: z.boolean(),
  });
}
const getPersistedStateSchema = () => (_persistedStateSchema ??= buildPersistedStateSchema());

type Listener<AuthState> = (value: AuthState) => void;

export interface StorageProvider {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export class UniversalAuthStore {
  private state: AuthState;
  private listeners = new Set<Listener<AuthState>>();
  private storage: StorageProvider;
  private key = 'auth-storage';
  private writeQueue: Promise<void> = Promise.resolve();
  private onSignOut?: () => Promise<unknown>;

  constructor(
    initialState: AuthState,
    storage: StorageProvider,
    onSignOut?: () => Promise<unknown>
  ) {
    this.state = initialState;
    this.storage = storage;
    this.onSignOut = onSignOut;
  }

  subscribe(listener: Listener<AuthState>) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async init() {
    try {
      const saved = await this.storage.getItem(this.key);
      if (saved) {
        const parsed = getPersistedStateSchema().safeParse(JSON.parse(saved));
        // apps/web is not strict, so zod infers every field optional there
        this.state = parsed.success
          ? {
              user: parsed.data.user as SessionUser | null,
              session: parsed.data.session,
              loading: false,
            }
          : { user: null, session: false, loading: false };
      } else {
        this.state = { ...this.state, loading: false };
      }
    } catch (e) {
      logger.error({ err: e }, 'AuthStore Init Error');
      this.state = { user: null, session: false, loading: false };
    } finally {
      this.notify();
    }
  }

  update(patch: Partial<AuthState>) {
    this.state = { ...this.state, ...patch };

    // Serialize storage writes so out-of-order resolution can't leave a
    // stale persisted copy behind two rapid update() calls.
    if (this.state.session) {
      const dataToSave = JSON.stringify({
        user: this.state.user,
        session: this.state.session,
      });
      this.writeQueue = this.writeQueue.then(() => this.storage.setItem(this.key, dataToSave));
    } else if (!this.state.loading) {
      this.writeQueue = this.writeQueue.then(() => this.storage.removeItem(this.key));
    }

    this.notify();
  }

  setAuth(user: SessionUser) {
    this.update({ session: true, user, loading: false });
  }

  async logout() {
    // Already logged out client-side: skip the network round-trip. Without
    // this, a burst of 401s (e.g. every in-flight request after the session
    // was revoked server-side) each call logout(), which calls onSignOut,
    // which itself 401s and can retrigger onUnauthorized — an unthrottled loop.
    if (!this.state.session) {
      return this.clear();
    }

    if (this.onSignOut) {
      try {
        await this.onSignOut();
      } catch (e) {
        logger.error({ err: e }, 'Server signOut failed');
      }
    }
    await this.clear();
  }

  async clear() {
    this.state = { user: null, session: false, loading: false };

    await this.storage.removeItem(this.key);

    this.notify();
  }

  updateUser(user: SessionUser) {
    this.update({ user });
  }

  getState() {
    return this.state;
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }
}
