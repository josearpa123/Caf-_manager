'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Coffee, Droplets, Handshake, ShieldCheck, Sprout, Wallet } from 'lucide-react';
import type { PlanPublico } from '@coffee-manager/shared-types';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CoffeeIllustration } from '@/components/marketing/coffee-illustration';
import { GrainOverlay } from '@/components/marketing/grain-overlay';

const CARACTERISTICAS = [
  {
    icon: Droplets,
    titulo: 'Recepción con criterio',
    descripcion:
      'Mojado, pergamino o pasilla, cada uno a su precio. Tabla de precios por humedad y factor de rendimiento, catálogo de defectos Cenicafé.',
    grande: true,
  },
  {
    icon: Sprout,
    titulo: 'Bodega en vivo',
    descripcion: 'Secado, trilla y stock por punto de compra, sin cuaderno ni Excel aparte.',
  },
  {
    icon: Handshake,
    titulo: 'Contratos a precio fijo',
    descripcion: 'Vende anticipado a una trilladora y entrega en varios lotes al mismo precio.',
  },
  {
    icon: Wallet,
    titulo: 'Pagos claros',
    descripcion: 'Anticipos, saldo pendiente por proveedor y reportes exportables a Excel.',
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
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background">
      <GrainOverlay />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Coffee className="h-4 w-4" />
            </span>
            <span className="font-display text-lg tracking-tight">Coffee Manager</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#inicio" className="transition-colors hover:text-foreground">
              Inicio
            </a>
            <a href="#nosotros" className="transition-colors hover:text-foreground">
              Sobre nosotros
            </a>
            <a href="#planes" className="transition-colors hover:text-foreground">
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

      <main className="relative z-10 flex-1">
        {/* ---------- HERO ---------- */}
        <section id="inicio" className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage:
                'radial-gradient(70% 55% at 15% 10%, hsl(var(--primary) / 0.12), transparent)',
            }}
          />
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-widest text-primary">
                Para puntos de compra de café en Colombia
              </span>
              <h1 className="mt-6 font-display text-[2.75rem] leading-[1.05] tracking-tight sm:text-6xl">
                Del caficultor a la trilladora,
                <br />
                <span className="text-primary">sin perder ni un kilo</span> en el camino
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Reemplaza el cuaderno y las hojas de cálculo: recepción con precio por calidad,
                bodega en vivo, ventas con contrato a precio fijo y pagos a proveedores, todo en
                un mismo lugar.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register" className={buttonVariants({ size: 'lg' })}>
                  Crear cuenta gratis
                </Link>
                <a href="#planes" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  Ver planes
                </a>
              </div>
              <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
                {[
                  ['12.5 kg', 'una arroba'],
                  ['CENICAFÉ', 'catálogo de defectos'],
                  ['30 min', 'sesión activa sin cortes'],
                ].map(([valor, label]) => (
                  <div key={label}>
                    <dt className="font-display text-xl text-foreground">{valor}</dt>
                    <dd className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
              <CoffeeIllustration className="w-full" />
            </div>
          </div>
        </section>

        {/* ---------- CARACTERÍSTICAS ---------- */}
        <section className="border-y border-border bg-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {CARACTERISTICAS.map((c, i) => (
                <Card
                  key={c.titulo}
                  className={cn(
                    'group border-border/80 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md',
                    c.grande && 'sm:col-span-2 lg:col-span-2 lg:row-span-1',
                    i % 2 === 1 && 'sm:translate-y-4',
                  )}
                >
                  <CardContent className="pt-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <c.icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 font-display text-lg">{c.titulo}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{c.descripcion}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- SOBRE NOSOTROS ---------- */}
        <section id="nosotros" className="relative overflow-hidden bg-primary py-24 text-primary-foreground">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(50% 80% at 85% 20%, hsl(var(--primary-foreground) / 0.12), transparent)',
            }}
          />
          <div className="mx-auto max-w-3xl px-6 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 opacity-80" />
            <p className="mt-6 font-display text-2xl leading-snug sm:text-3xl">
              &quot;Nace para reemplazar los cuadernos y hojas de cálculo con los que hoy se
              administra la compra de café en la mayoría de puntos de compra.&quot;
            </p>
            <p className="mt-6 text-primary-foreground/80">
              Cada módulo — recepción, bodega, ventas, pagos — sigue de cerca cómo funciona
              realmente el negocio cafetero: factor de rendimiento, humedad, secado, trilla, y la
              relación de confianza con cada proveedor. Empezamos acompañando fincas y puntos de
              compra pequeños, y crecemos con cada negocio que se suma. Por eso cada cuenta nueva
              se revisa antes de activarse: preferimos crecer despacio y bien acompañados.
            </p>
          </div>
        </section>

        {/* ---------- PLANES ---------- */}
        <section id="planes" className="py-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center">
              <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary">
                Planes
              </span>
              <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
                Elige uno al registrarte
              </h2>
              <p className="mt-2 text-muted-foreground">
                O crea tu cuenta sin definirlo todavía y lo conversamos al activarla.
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
                  'mt-12 grid grid-cols-1 gap-6',
                  planes.length === 2 && 'sm:grid-cols-2',
                  planes.length >= 3 && 'sm:grid-cols-2 lg:grid-cols-3',
                )}
              >
                {planes.map((p) => (
                  <Card
                    key={p.id}
                    className="flex flex-col border-border/80 transition-shadow hover:shadow-md"
                  >
                    <CardHeader>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Coffee className="h-[18px] w-[18px]" />
                      </span>
                      <CardTitle className="font-display text-xl font-normal">
                        {p.nombre}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4">
                      <ul className="flex-1 space-y-2.5 text-sm text-muted-foreground">
                        <li>
                          Hasta{' '}
                          <strong className="font-display text-base font-normal text-foreground">
                            {p.maxUsuarios}
                          </strong>{' '}
                          usuario{p.maxUsuarios === 1 ? '' : 's'}
                        </li>
                        <li>
                          {p.maxPuntosCompra ? (
                            <>
                              Hasta{' '}
                              <strong className="font-display text-base font-normal text-foreground">
                                {p.maxPuntosCompra}
                              </strong>{' '}
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

        {/* ---------- CTA FINAL ---------- */}
        <section className="border-t border-border py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 text-center">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              ¿Listo para dejar el cuaderno?
            </h2>
            <Link href="/register" className={buttonVariants({ size: 'lg' })}>
              Crear cuenta gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-8">
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
