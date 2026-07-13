'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Coffee,
  FileText,
  HandCoins,
  PackageCheck,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { Modulo } from '@coffee-manager/shared-types';
import { useAuth } from '@/lib/auth';
import { AppShell, type AppShellNavItem } from '@/components/shell/app-shell';
import { ModuloBloqueado } from '@/components/shell/modulo-bloqueado';

// Un ítem sin `modulo` no se puede excluir de un plan: la administración del
// propio tenant va siempre incluida.
const navItems: (AppShellNavItem & { modulo?: Modulo })[] = [
  { href: '/proveedores', label: 'Proveedores', icon: Users, modulo: Modulo.PROVEEDORES },
  { href: '/recepcion', label: 'Recepción', icon: PackageCheck, modulo: Modulo.RECEPCION },
  { href: '/bodega', label: 'Bodega', icon: Warehouse, modulo: Modulo.BODEGA },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart, modulo: Modulo.VENTAS },
  { href: '/cortes', label: 'Cortes', icon: Truck, modulo: Modulo.CORTES },
  { href: '/pagos', label: 'Pagos', icon: Wallet, modulo: Modulo.PAGOS },
  { href: '/prestamos', label: 'Préstamos', icon: HandCoins, modulo: Modulo.PRESTAMOS },
  { href: '/facturacion', label: 'Facturación', icon: FileText, modulo: Modulo.FACTURACION },
  { href: '/reportes', label: 'Reportes', icon: BarChart3, exact: true, modulo: Modulo.REPORTES },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
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
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  // Ocultar del menú lo que el plan no incluye. Sin plan (null) se muestra
  // todo. El bloqueo de verdad lo hace el ModuloGuard en la API; esto es para
  // que el tenant no vea puertas que no puede abrir.
  const modulos = user.modulos;
  const navVisible = modulos
    ? navItems.filter((item) => !item.modulo || modulos.includes(item.modulo))
    : navItems;

  // Al menú no se llega, pero a la URL sí (un link guardado, el historial).
  // Si la ruta pertenece a un módulo fuera del plan, mostramos la explicación
  // en vez de la página: sus peticiones darían 403 y se vería vacía.
  const moduloDeLaRuta = navItems.find(
    (item) => item.modulo && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  )?.modulo;
  const bloqueado =
    modulos && moduloDeLaRuta && !modulos.includes(moduloDeLaRuta) ? moduloDeLaRuta : null;

  return (
    <AppShell
      brandIcon={Coffee}
      brandLabel="Coffee Manager"
      navItems={navVisible}
      userName={user.nombre}
      onLogout={logout}
    >
      {bloqueado ? (
        <ModuloBloqueado modulo={bloqueado} volverHref={navVisible[0]?.href ?? '/configuracion'} />
      ) : (
        children
      )}
    </AppShell>
  );
}
