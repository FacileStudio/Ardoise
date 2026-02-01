import { UniversalAuthStore } from '@repo/shared';
import { authClient } from './auth-client';
import * as SecureStore from 'expo-secure-store';

const mobileStorage = {
  getItem: async (key: string) => await SecureStore.getItemAsync(key),
  setItem: async (key: string, val: string) => await SecureStore.setItemAsync(key, val),
  removeItem: async (key: string) => await SecureStore.deleteItemAsync(key),
};

export const auth = new UniversalAuthStore(
  { user: null, session: null, loading: true },
  mobileStorage,
  () => authClient.signOut()
);

auth.init();
