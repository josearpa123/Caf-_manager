'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, ClipboardList, LayoutGrid, ShieldCheck } from 'lucide-react';
import type { PlatformTenant } from '@coffee-manager/shared-types';
import { PlatformAuthProvider, usePlatformAuth } from '@/lib/platform-auth';
import { platformApi } from '@/lib/platform-api';
import { AppShell, type AppShellNavItem } from '@/components/shell/app-shell';

function PlatformShell({ children }: { children: React.ReactNode }) {
  const { admin, isLoading, logout } = usePlatformAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/platform/login';
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    if (!isLoading && !admin && !isLoginPage) {
      router.replace('/platform/login');
    }
  }, [isLoading, admin, isLoginPage, router]);

  useEffect(() => {
    if (!admin) return;
    platformApi
      .get<PlatformTenant[]>('/platform/tenants')
      .then((tenants) => setPendientes(tenants.filter((t) => t.estado === 'PENDIENTE').length))
      .catch(() => {});
  }, [admin, pathname]);

  if (isLoginPage) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.12), transparent)',
          }}
        />
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-lg tracking-tight">Coffee Manager</span>
          </div>
          <div className="w-full">{children}</div>
        </div>
      </div>
    );
  }

  if (isLoading || !admin) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  const navItems: AppShellNavItem[] = [
    { href: '/platform', label: 'Tenants', icon: Building2, exact: true },
    {
      href: '/platform/solicitudes',
      label: 'Solicitudes',
      icon: ClipboardList,
      badge: pendientes,
    },
    { href: '/platform/planes', label: 'Planes', icon: LayoutGrid },
  ];

  return (
    <AppShell
      brandIcon={ShieldCheck}
      brandLabel="Coffee Manager"
      brandSublabel="Plataforma"
      navItems={navItems}
      userName={admin.nombre}
      onLogout={logout}
    >
      {children}
    </AppShell>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAuthProvider>
      <PlatformShell>{children}</PlatformShell>
    </PlatformAuthProvider>
  );
}
