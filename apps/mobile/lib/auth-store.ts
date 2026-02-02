import { UniversalAuthStore } from '@repo/auth-shared';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { trpc } from './trpc';

const mobileStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, val: string) => {
    try {
      await SecureStore.setItemAsync(key, val);
    } catch (e) {
      console.error('SecureStore Save Error', e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('SecureStore Delete Error', e);
    }
  },
};

export const authStore = new UniversalAuthStore(
  { user: null, session: null, loading: true },
  mobileStorage,
  async () => {
    try {
      await trpc.auth.logout.mutate();
    } catch (e) {
      console.error('Mobile Logout Error', e);
    }
    setTimeout(() => {
      if (router.canGoBack()) router.dismissAll();
      router.replace('/login');
    }, 0);
  }
);

authStore.init();
