import { UniversalAuthStore, type SessionUser } from '@repo/auth-shared';
import { browser } from '$app/environment';
import { logger } from '@repo/logger';
import { trpc } from './trpc';

const webStorage = {
  getItem: (key: string) => (browser ? localStorage.getItem(key) : null),
  setItem: (key: string, val: string) => {
    if (browser) localStorage.setItem(key, val);
  },
  removeItem: (key: string) => {
    if (browser) localStorage.removeItem(key);
  },
};

export const authStore = new UniversalAuthStore(
  { user: null, session: false, loading: true },
  webStorage,
  async () => {
    if (browser) {
      try {
        await trpc.auth.logout.mutate({});
      } catch (e) {
        logger.error({ err: e }, 'Logout failed');
      }
      window.location.href = '/login';
    }
  }
);

export default authStore;

export async function verifySession(): Promise<boolean> {
  if (!authStore.getState().user) return false;
  try {
    const user = await trpc.auth.me.query({});
    if (user) {
      authStore.updateUser(user as SessionUser);
      return true;
    }
    await authStore.clear();
    return false;
  } catch (e) {
    const data = (e as { data?: { httpStatus?: number; code?: string } }).data;
    if (data?.httpStatus === 401 || data?.code === 'UNAUTHORIZED') {
      await authStore.clear();
    }
    return false;
  }
}
