import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: browser ? localStorage.getItem('token') : null,
  loading: false,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    setAuth: (token: string, user: User) => {
      if (browser) localStorage.setItem('token', token);
      update(state => ({ ...state, token, user }));
    },
    logout: () => {
      if (browser) localStorage.removeItem('token');
      set({ user: null, token: null, loading: false });
    },
    setLoading: (loading: boolean) => {
      update(state => ({ ...state, loading }));
    },
  };
}

export const auth = createAuthStore();
export const getToken = () => browser ? localStorage.getItem('token') : null;
