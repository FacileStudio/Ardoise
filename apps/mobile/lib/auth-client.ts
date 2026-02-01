import { createAuthClient } from 'better-auth/client';
import * as SecureStore from 'expo-secure-store';
import { EXPO_PUBLIC_API_URL } from '../constants/Config';

export const authClient = createAuthClient({
  baseURL: EXPO_PUBLIC_API_URL,
  fetchOptions: {
    auth: {
      type: 'Bearer',
      token: async () => {
        const res = await SecureStore.getItemAsync('auth-storage');
        if (res) {
          try {
            const parsed = JSON.parse(res);
            return parsed.session?.token || null;
          } catch {
            return null;
          }
        }
        return null;
      },
    },
  },
});

export type AuthClient = typeof authClient;
