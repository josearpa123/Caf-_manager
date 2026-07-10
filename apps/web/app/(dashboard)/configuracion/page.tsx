'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TenantSelf } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

const SECCIONES = [
  {
    href: '/configuracion/puntos-compra',
    titulo: 'Puntos de compra',
    descripcion: 'Sedes/sucursales donde se recibe café.',
  },
  {
    href: '/configuracion/usuarios',
    titulo: 'Usuarios',
    descripcion: 'Empleados con acceso al sistema y sus roles.',
  },
  {
    href: '/configuracion/roles',
    titulo: 'Roles y permisos',
    descripcion: 'Qué puede hacer cada rol dentro del negocio.',
  },
];

export default function ConfiguracionPage() {
  const [tenant, setTenant] = useState<TenantSelf | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<TenantSelf>('/tenants/me')
      .then(setTenant)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la configuración'),
      );
  }, []);

  return (
    <div className="p-8">
      <PageHeader title="Configuración" />

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {tenant && (
        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle>{tenant.nombre}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-medium">{tenant.plan?.nombre ?? 'Sin plan asignado'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Usuarios</p>
              <p className="text-sm font-medium">
                {tenant._count.users}
                {tenant.plan ? ` / ${tenant.plan.maxUsuarios}` : ' (sin límite)'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Puntos de compra</p>
              <p className="text-sm font-medium">
                {tenant._count.puntosCompra}
                {tenant.plan?.maxPuntosCompra
                  ? ` / ${tenant.plan.maxPuntosCompra}`
                  : ' (sin límite)'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid max-w-xl gap-4">
        {SECCIONES.map((s) => (
          <Card key={s.href}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="font-medium">{s.titulo}</p>
                <p className="text-sm text-muted-foreground">{s.descripcion}</p>
              </div>
              <Link href={s.href} className={buttonVariants({ variant: 'outline' })}>
                Gestionar
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
