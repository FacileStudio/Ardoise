import React, { createContext, useContext, useEffect, useState } from 'react';
import { authStore } from './auth-store';
import type { AuthState } from '@repo/auth-shared';

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    let initialState: AuthState = { user: null, session: null, loading: true };
    const unsub = authStore.subscribe((s) => (initialState = s));
    unsub();
    return initialState;
  });

  useEffect(() => {
      const unsubscribe = authStore.subscribe((newState) => {
          setState(newState);
      });

      return () => {
          unsubscribe();
      };
  }, []);

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { authStore as auth };
