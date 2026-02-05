import { UniversalAuthStore } from '@repo/auth-shared';
import { browser } from '$app/environment';
import { logger } from '@repo/logger';
import { trpc } from './trpc';

const webStorage = {
  getItem: (key: string) => (browser ? localStorage.getItem(key) : null),
  setItem: (key: string, val: string) => browser && localStorage.setItem(key, val),
  removeItem: (key: string) => browser && localStorage.removeItem(key),
};

export const authStore = new UniversalAuthStore(
  { user: null, session: null, loading: true },
  webStorage,
  async () => {
    if (browser) {
      try {
        await trpc.auth.logout.mutate();
      } catch (e) {
        logger.error({ err: e }, 'Logout failed');
      }
      window.location.href = '/';
    }
  }
);

export default authStore;
