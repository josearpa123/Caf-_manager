'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/proveedores', label: 'Proveedores' },
  { href: '/recepcion', label: 'Recepción' },
  { href: '/bodega', label: 'Bodega' },
  { href: '/pagos', label: 'Pagos' },
  { href: '/facturacion', label: 'Facturación' },
  { href: '/reportes', label: 'Reportes' },
  { href: '/configuracion', label: 'Configuración' },
];

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
    return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col justify-between border-r p-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
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
        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="truncate text-xs text-muted-foreground">{user.nombre}</p>
          <Button variant="outline" size="sm" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
