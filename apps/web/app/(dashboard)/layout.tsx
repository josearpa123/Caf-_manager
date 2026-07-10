'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Coffee,
  FileText,
  PackageCheck,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AppShell, type AppShellNavItem } from '@/components/shell/app-shell';

const navItems: AppShellNavItem[] = [
  { href: '/proveedores', label: 'Proveedores', icon: Users },
  { href: '/recepcion', label: 'Recepción', icon: PackageCheck },
  { href: '/bodega', label: 'Bodega', icon: Warehouse },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/pagos', label: 'Pagos', icon: Wallet },
  { href: '/facturacion', label: 'Facturación', icon: FileText },
  { href: '/reportes', label: 'Reportes', icon: BarChart3, exact: true },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

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
    <AppShell
      brandIcon={Coffee}
      brandLabel="Coffee Manager"
      navItems={navItems}
      userName={user.nombre}
      onLogout={logout}
    >
      {children}
    </AppShell>
  );
}
