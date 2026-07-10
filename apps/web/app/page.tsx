'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Coffee, ShieldCheck, ShoppingCart, Warehouse } from 'lucide-react';
import type { PlanPublico } from '@coffee-manager/shared-types';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CARACTERISTICAS = [
  {
    icon: Coffee,
    titulo: 'Recepción de café',
    descripcion:
      'Compra mojado, pergamino o pasilla con tabla de precios por calidad y catálogo de defectos.',
  },
  {
    icon: Warehouse,
    titulo: 'Bodega e inventario',
    descripcion: 'Secado, trilla y stock en vivo por punto de compra, sin hojas de cálculo.',
  },
  {
    icon: ShoppingCart,
    titulo: 'Ventas y contratos',
    descripcion:
      'Vende a trilladoras con precio libre o fija hoy un contrato de venta anticipada.',
  },
  {
    icon: BarChart3,
    titulo: 'Pagos y reportes',
    descripcion:
      'Anticipos, saldo pendiente a proveedores y reportes exportables a Excel en un solo lugar.',
  },
];

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [planes, setPlanes] = useState<PlanPublico[]>([]);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/proveedores');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    api.get<PlanPublico[]>('/registro/planes').then(setPlanes).catch(() => {});
  }, []);

  if (isLoading || user) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Coffee className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">Coffee Manager</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#inicio" className="hover:text-foreground">
              Inicio
            </a>
            <a href="#nosotros" className="hover:text-foreground">
              Sobre nosotros
            </a>
            <a href="#planes" className="hover:text-foreground">
              Planes
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Ingresar
            </Link>
            <Link href="/register" className={buttonVariants({ size: 'sm' })}>
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section id="inicio" className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                'radial-gradient(60% 60% at 50% 0%, hsl(var(--primary) / 0.12), transparent)',
            }}
          />
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Gestiona la compra, bodega y venta de café en un solo lugar
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Recepción con tabla de precios, secado y trilla, ventas con contratos a precio fijo,
              pagos a proveedores y reportes — pensado para puntos de compra de café en Colombia.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className={buttonVariants({ size: 'lg' })}>
                Crear cuenta gratis
              </Link>
              <a href="#planes" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Ver planes
              </a>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
            {CARACTERISTICAS.map((c) => (
              <Card key={c.titulo}>
                <CardContent className="pt-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <c.icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-3 font-medium">{c.titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.descripcion}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="nosotros" className="border-t py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sobre nosotros</h2>
            <p className="mt-4 text-muted-foreground">
              Coffee Manager nace para reemplazar los cuadernos y hojas de cálculo con los que
              hoy se administra la compra de café en la mayoría de puntos de compra. Cada módulo
              — recepción, bodega, ventas, pagos — sigue de cerca cómo funciona realmente el
              negocio cafetero: factor de rendimiento, humedad, secado, trilla, y la relación de
              confianza con cada proveedor. Empezamos acompañando fincas y puntos de compra
              pequeños, y crecemos con cada negocio que se suma.
            </p>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Cada cuenta nueva es revisada antes de activarse
            </div>
          </div>
        </section>

        <section id="planes" className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Planes</h2>
              <p className="mt-2 text-muted-foreground">
                Elige un plan al registrarte, o crea tu cuenta y lo conversamos al activarla.
              </p>
            </div>

            {planes.length === 0 ? (
              <p className="mt-10 text-center text-sm text-muted-foreground">
                Estamos afinando los planes — crea tu cuenta y te contactamos con las opciones
                disponibles.
              </p>
            ) : (
              <div
                className={cn(
                  'mt-10 grid grid-cols-1 gap-6',
                  planes.length === 2 && 'sm:grid-cols-2',
                  planes.length >= 3 && 'sm:grid-cols-2 lg:grid-cols-3',
                )}
              >
                {planes.map((p) => (
                  <Card key={p.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle>{p.nombre}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
                        <li>
                          Hasta <strong className="text-foreground">{p.maxUsuarios}</strong>{' '}
                          usuario{p.maxUsuarios === 1 ? '' : 's'}
                        </li>
                        <li>
                          {p.maxPuntosCompra ? (
                            <>
                              Hasta{' '}
                              <strong className="text-foreground">{p.maxPuntosCompra}</strong>{' '}
                              punto{p.maxPuntosCompra === 1 ? '' : 's'} de compra
                            </>
                          ) : (
                            'Puntos de compra ilimitados'
                          )}
                        </li>
                      </ul>
                      <Link href="/register" className={buttonVariants({ variant: 'outline' })}>
                        Elegir {p.nombre}
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-t py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              ¿Listo para dejar el cuaderno?
            </h2>
            <Link href="/register" className={buttonVariants({ size: 'lg' })}>
              Crear cuenta gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Coffee Manager</p>
          <Link href="/platform/login" className="hover:text-foreground">
            Acceso administradores
          </Link>
        </div>
      </footer>
    </div>
  );
}
