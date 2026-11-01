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

const isUnauthorized = (e: unknown) => {
  const data = (e as { data?: { httpStatus?: number; code?: string } }).data;
  return data?.httpStatus === 401 || data?.code === 'UNAUTHORIZED';
};

async function queryMe() {
  try {
    return await trpc.auth.me.query({});
  } catch (e) {
    if (!isUnauthorized(e)) throw e;
    await trpc.auth.refresh.mutate({});
    return await trpc.auth.me.query({});
  }
}

export async function verifySession(): Promise<boolean> {
  if (!authStore.getState().user) return false;
  try {
    const user = await queryMe();
    if (user) {
      authStore.updateUser(user as SessionUser);
      return true;
    }
    await authStore.clear();
    return false;
  } catch (e) {
    if (isUnauthorized(e)) await authStore.clear();
    return false;
  }
}
