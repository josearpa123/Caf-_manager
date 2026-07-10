'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PlatformAuthProvider, usePlatformAuth } from '@/lib/platform-auth';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/platform', label: 'Tenants' },
  { href: '/platform/planes', label: 'Planes' },
];

function PlatformShell({ children }: { children: React.ReactNode }) {
  const { admin, isLoading, logout } = usePlatformAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/platform/login';

  useEffect(() => {
    if (!isLoading && !admin && !isLoginPage) {
      router.replace('/platform/login');
    }
  }, [isLoading, admin, isLoginPage, router]);

  if (isLoginPage) {
    return <div className="flex min-h-screen items-center justify-center">{children}</div>;
  }

  if (isLoading || !admin) {
    return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col justify-between border-r p-4">
        <div>
          <p className="px-2 text-xs font-semibold uppercase text-muted-foreground">
            Panel de plataforma
          </p>
          <nav className="mt-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2 py-1.5 text-sm ${
                    active
                      ? 'bg-secondary font-medium text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="truncate text-xs text-muted-foreground">{admin.nombre}</p>
          <Button variant="outline" size="sm" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAuthProvider>
      <PlatformShell>{children}</PlatformShell>
    </PlatformAuthProvider>
  );
}
