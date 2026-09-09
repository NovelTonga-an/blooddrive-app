import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { authApi, AuthUser, RegisterPayload, LoginPayload } from '../services/api';

const TOKEN_KEY = 'donor_auth_token';
const USER_KEY = 'donor_auth_user';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { value: storedToken } = await Preferences.get({ key: TOKEN_KEY });
      const { value: storedUser } = await Preferences.get({ key: USER_KEY });

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }

      setIsLoading(false);
    })();
  }, []);

  async function persistSession(newToken: string, newUser: AuthUser) {
    await Preferences.set({ key: TOKEN_KEY, value: newToken });
    await Preferences.set({ key: USER_KEY, value: JSON.stringify(newUser) });
    setToken(newToken);
    setUser(newUser);
  }

  async function login(payload: LoginPayload) {
    const response = await authApi.login(payload);
    await persistSession(response.token, response.user);
  }

  async function register(payload: RegisterPayload) {
    const response = await authApi.register(payload);
    await persistSession(response.token, response.user);
  }

  async function logout() {
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        // Token may already be invalid server-side — clear the local session regardless.
      }
    }

    await Preferences.remove({ key: TOKEN_KEY });
    await Preferences.remove({ key: USER_KEY });
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}