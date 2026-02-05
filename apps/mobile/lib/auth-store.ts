import { UniversalAuthStore } from '@repo/auth-shared';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { logger } from '@repo/logger';
import { trpc } from './trpc';

const mobileStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, val: string) => {
    try {
      await SecureStore.setItemAsync(key, val);
    } catch (err) {
      logger.error({ err }, 'SecureStore Save Error');
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      logger.error({ err }, 'SecureStore Delete Error');
    }
  },
};

export const authStore = new UniversalAuthStore(
  { user: null, session: null, loading: true },
  mobileStorage,
  async () => {
    try {
      await trpc.auth.logout.mutate({});
    } catch (err) {
      logger.error({ err }, 'Mobile Logout Error');
    }
    setTimeout(() => {
      if (router.canGoBack()) router.dismissAll();
      router.replace('/login');
    }, 0);
  }
);

authStore.init();
