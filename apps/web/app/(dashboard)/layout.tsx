'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Coffee,
  FileText,
  LogOut,
  PackageCheck,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/proveedores', label: 'Proveedores', icon: Users },
  { href: '/recepcion', label: 'Recepción', icon: PackageCheck },
  { href: '/bodega', label: 'Bodega', icon: Warehouse },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/pagos', label: 'Pagos', icon: Wallet },
  { href: '/facturacion', label: 'Facturación', icon: FileText },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
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
              <Coffee className="h-[18px] w-[18px]" />
            </span>
            <p className="text-sm font-semibold">Coffee Manager</p>
          </div>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = pathname?.startsWith(item.href);
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
            {initials(user.nombre)}
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{user.nombre}</p>
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
