'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, clearToken, getToken, setToken } from './api';

interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const USER_STORAGE_KEY = 'coffee-manager:user';
const REFRESH_STORAGE_KEY = 'coffee-manager:refreshToken';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = window.localStorage.getItem(USER_STORAGE_KEY);
    if (stored && getToken()) {
      setUser(JSON.parse(stored) as AuthUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    setToken(res.accessToken);
    window.localStorage.setItem(REFRESH_STORAGE_KEY, res.refreshToken);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = window.localStorage.getItem(REFRESH_STORAGE_KEY);
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    clearToken();
    window.localStorage.removeItem(REFRESH_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
