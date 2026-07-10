'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  clearPlatformToken,
  getPlatformToken,
  platformApi,
  setPlatformToken,
} from './platform-api';

interface PlatformAdmin {
  id: string;
  email: string;
  nombre: string;
}

interface PlatformLoginResponse {
  accessToken: string;
  admin: PlatformAdmin;
}

interface PlatformAuthContextValue {
  admin: PlatformAdmin | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const ADMIN_STORAGE_KEY = 'coffee-manager:platform:admin';

const PlatformAuthContext = createContext<PlatformAuthContextValue | undefined>(
  undefined,
);

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (stored && getPlatformToken()) {
      setAdmin(JSON.parse(stored) as PlatformAdmin);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await platformApi.post<PlatformLoginResponse>('/platform/auth/login', {
      email,
      password,
    });
    setPlatformToken(res.accessToken);
    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(res.admin));
    setAdmin(res.admin);
  }, []);

  const logout = useCallback(() => {
    clearPlatformToken();
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdmin(null);
    router.push('/platform/login');
  }, [router]);

  return (
    <PlatformAuthContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error('usePlatformAuth debe usarse dentro de <PlatformAuthProvider>');
  return ctx;
}
