import { browser } from '$app/environment';
import { authClient } from '../auth-client';
import { type AuthState, type User } from '@repo/types';
import storage from '$lib/storage';
import { goto } from '$app/navigation';

function createAuthStore() {
  const authStore = storage<AuthState>('events', {
    user: null,
    session: null,
    loading: true,
  });
  if (browser) {
    authClient.getSession().then((session) => {
      if (session && session.data) {
        authStore.update((state) => ({
          ...state,
          session: session.data?.session,
          user: session.data?.user as User,
          loading: false,
        }));
      } else {
        authStore.update((state) => ({ ...state, loading: false }));
      }
    });
  }

  return {
    subscribe: authStore.subscribe,
    setAuth: (session: any, user: User) => {
      authStore.update((state) => ({ ...state, session, user, loading: false }));
    },
    logout: async () => {
      if (browser) {
        await authClient.signOut();
        goto('/');
      }
      authStore.set({ user: null, session: null, loading: false });
    },
    setLoading: (loading: boolean) => {
      authStore.update((state) => ({ ...state, loading }));
    },
  };
}

export const auth = createAuthStore();
