'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Modulo } from '@coffee-manager/shared-types';
import {
  api,
  clearRefreshToken,
  clearToken,
  getRefreshToken,
  getToken,
  setRefreshToken,
  setToken,
} from './api';

interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  // Módulos del plan del tenant. null = sin plan asignado, es decir, sin
  // restricción de módulos (el backend lo trata igual, ver ModuloGuard).
  modulos: Modulo[] | null;
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

  // El cliente de API (lib/api.ts) renueva el access token en silencio con
  // el refresh token ante cualquier 401 — así una sesión activa dura tanto
  // como el refresh token (30 días por defecto), no los 30 minutos del
  // access token. Este evento solo se dispara cuando el refresh token
  // también venció/fue revocado, es decir, cuando de verdad hay que volver
  // a loguearse.
  useEffect(() => {
    const onSessionExpired = () => {
      window.localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      router.replace('/login');
    };
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    setToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    clearToken();
    clearRefreshToken();
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
