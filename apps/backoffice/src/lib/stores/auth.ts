import { UniversalAuthStore } from '@repo/shared';
import { authClient } from '../auth-client';
import { browser } from '$app/environment';

const webStorage = {
  getItem: (key: string) => (browser ? localStorage.getItem(key) : null),
  setItem: (key: string, val: string) => browser && localStorage.setItem(key, val),
  removeItem: (key: string) => browser && localStorage.removeItem(key),
};

export const auth = new UniversalAuthStore(
  { user: null, session: null, loading: true },
  webStorage,
  () => authClient.signOut()
);

if (browser) auth.init();
