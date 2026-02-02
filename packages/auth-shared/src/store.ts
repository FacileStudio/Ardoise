import type { AuthState, SessionUser } from './';
import Cookies from 'js-cookie';

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
  private cookieName = 'auth_token';
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
        this.state = { ...JSON.parse(saved), loading: false };
      } else {
        this.state = { ...this.state, loading: false };
      }
    } catch (e) {
      console.error('AuthStore Init Error:', e);
      this.state = { user: null, session: null, loading: false };
    } finally {
      this.notify();
    }
  }

  update(patch: Partial<AuthState>) {
    this.state = { ...this.state, ...patch };

    if (this.state.session) {
      const dataToSave = JSON.stringify({
        user: this.state.user,
        session: this.state.session,
      });
      this.storage.setItem(this.key, dataToSave);
    } else if (!this.state.loading) {
      this.storage.removeItem(this.key);
    }

    this.notify();
  }

  setAuth(session: { token: string }, user: SessionUser) {
    if (typeof document !== 'undefined') {
      Cookies.set(this.cookieName, session.token, {
        expires: 7,
        path: '/',
        sameSite: 'strict',
        secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      });
    }

    this.update({ session, user: user as SessionUser, loading: false });
  }

  async logout() {
    if (this.onSignOut) {
      try {
        await this.onSignOut();
      } catch (e) {
        console.error('Server signOut failed:', e);
      }
    }
    await this.clear();
  }

  async clear() {
    this.state = { user: null, session: null, loading: false };

    await this.storage.removeItem(this.key);

    if (typeof document !== 'undefined') {
      Cookies.remove(this.cookieName, { path: '/' });
    }

    this.notify();
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }
}
