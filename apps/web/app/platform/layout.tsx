'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LayoutGrid, LogOut, ShieldCheck } from 'lucide-react';
import { PlatformAuthProvider, usePlatformAuth } from '@/lib/platform-auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/platform', label: 'Tenants', icon: Building2 },
  { href: '/platform/planes', label: 'Planes', icon: LayoutGrid },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

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
            <span className="text-lg font-semibold tracking-tight">Coffee Manager</span>
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

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-60 shrink-0 flex-col justify-between border-r bg-card px-3 py-4">
        <div>
          <div className="flex items-center gap-2 px-2 pb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Coffee Manager</p>
              <p className="text-xs text-muted-foreground">Plataforma</p>
            </div>
          </div>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-150',
                    active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2.5 border-t pt-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {initials(admin.nombre)}
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{admin.nombre}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Cerrar sesión"
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
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
