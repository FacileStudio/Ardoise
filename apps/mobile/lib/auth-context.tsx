import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './auth-store';
import type { AuthState } from '@repo/shared';

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true
  });

  useEffect(() => {
    const unsubscribe = auth.subscribe((newState) => {
      setState(newState);
    });

    // On enveloppe pour satisfaire le type 'Destructor' de React
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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export { auth as authActions };
