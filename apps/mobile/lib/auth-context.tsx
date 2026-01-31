import React, { createContext, useState, useContext, useEffect } from 'react';
import { authClient } from './auth-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  loading: boolean;
  setAuth: (session: any, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    try {
      const sessionData = await authClient.getSession();
      if (sessionData) {
        setSession(sessionData.session);
        setUser(sessionData.user as User);
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const setAuthHandler = (newSession: any, newUser: User) => {
    setSession(newSession);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await authClient.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, setAuth: setAuthHandler, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
