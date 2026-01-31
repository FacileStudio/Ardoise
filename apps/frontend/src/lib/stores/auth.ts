import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { authClient } from '../auth-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  if (browser) {
    authClient.getSession().then((session) => {
      if (session) {
        update(state => ({
          ...state,
          session: session.session,
          user: session.user as User,
          loading: false
        }));
      } else {
        update(state => ({ ...state, loading: false }));
      }
    });
  }

  return {
    subscribe,
    setAuth: (session: any, user: User) => {
      update(state => ({ ...state, session, user, loading: false }));
    },
    logout: async () => {
      if (browser) {
        await authClient.signOut();
      }
      set({ user: null, session: null, loading: false });
    },
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, loading }));
    },
  };
}

export const auth = createAuthStore();
