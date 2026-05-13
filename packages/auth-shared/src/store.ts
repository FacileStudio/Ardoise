import type { AuthState, SessionUser } from './';
import { logger } from '@repo/logger';

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
  private onSignOut?: () => Promise<any>;

  constructor(initialState: AuthState, storage: StorageProvider, onSignOut?: () => Promise<any>) {
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
        const parsed = JSON.parse(saved);
        this.state = {
          user: parsed.user || null,
          session: parsed.user ? { active: true } : null,
          loading: false,
        };
      } else {
        this.state = { ...this.state, loading: false };
      }
    } catch (e) {
      logger.error({ err: e }, 'AuthStore Init Error');
      this.state = { user: null, session: null, loading: false };
    } finally {
      this.notify();
    }
  }

  update(patch: Partial<AuthState>) {
    this.state = { ...this.state, ...patch };

    if (this.state.user) {
      const dataToSave = JSON.stringify({
        user: this.state.user,
      });
      this.storage.setItem(this.key, dataToSave);
    } else if (!this.state.loading) {
      this.storage.removeItem(this.key);
    }

    this.notify();
  }

  setAuth(user: SessionUser) {
    this.update({ session: { active: true }, user, loading: false });
  }

  async logout() {
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
    this.state = { user: null, session: null, loading: false };
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
