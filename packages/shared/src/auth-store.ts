import type { User, AuthState } from './types';

type Listener<T> = (value: T) => void;

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
    return () => this.listeners.delete(listener);
  }

  async init() {
    try {
      const saved = await this.storage.getItem(this.key);
      if (saved) {
        this.state = { ...JSON.parse(saved), loading: false };
        this.notify();
      } else {
        this.update({ loading: false });
      }
    } catch (e) {
      console.error('AuthStore Init Error:', e);
      await this.clear();
    }
  }

  update(patch: Partial<AuthState>) {
    this.state = { ...this.state, ...patch };
    const dataToSave = JSON.stringify({
      user: this.state.user,
      session: this.state.session,
    });
    this.storage.setItem(this.key, dataToSave);
    this.notify();
  }

  setAuth(session: any, user: User) {
    this.update({ session, user, loading: false });
  }

  async logout(callback?: () => void) {
    if (this.onSignOut) {
      try {
        await this.onSignOut();
      } catch (e) {
        console.error('Server signOut failed:', e);
      }
    }
    await this.clear();
    if (callback) callback();
  }

  async clear() {
    this.state = { user: null, session: null, loading: false };
    await this.storage.removeItem(this.key);
    this.notify();
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }
}
