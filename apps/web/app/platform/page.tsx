'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { EstadoTenant, Plan, PlatformTenant } from '@coffee-manager/shared-types';
import { platformApi, ApiError } from '@/lib/platform-api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  PRUEBA: 'Prueba',
  PENDIENTE: 'Pendiente de aprobación',
};

const ESTADO_VARIANT: Record<string, NonNullable<BadgeProps['variant']>> = {
  ACTIVO: 'success',
  SUSPENDIDO: 'destructive',
  PRUEBA: 'warning',
  PENDIENTE: 'primary',
};

export default function PlatformDashboardPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([
      platformApi.get<PlatformTenant[]>('/platform/tenants'),
      platformApi.get<Plan[]>('/platform/planes'),
    ])
      .then(([t, p]) => {
        setTenants(t);
        setPlanes(p);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar tenants'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const pendientes = tenants.filter((t) => t.estado === 'PENDIENTE');
  const tenantsOrdenados = [...pendientes, ...tenants.filter((t) => t.estado !== 'PENDIENTE')];

  const cambiarPlan = async (tenantId: string, planId: string) => {
    setUpdatingId(tenantId);
    setError(null);
    try {
      await platformApi.patch(`/platform/tenants/${tenantId}`, { planId: planId || null });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el plan');
    } finally {
      setUpdatingId(null);
    }
  };

  const cambiarEstado = async (tenantId: string, estado: EstadoTenant) => {
    setUpdatingId(tenantId);
    setError(null);
    try {
      await platformApi.patch(`/platform/tenants/${tenantId}`, { estado });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <Link href="/platform/tenants/nuevo" className={buttonVariants()}>
          Nuevo tenant
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {pendientes.length > 0 && (
        <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-sm">
          {pendientes.length === 1
            ? 'Hay 1 registro pendiente de aprobación.'
            : `Hay ${pendientes.length} registros pendientes de aprobación.`}
        </p>
      )}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Usuarios</TableHead>
            <TableHead>Puntos de compra</TableHead>
            <TableHead>Creado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={7}>Cargando…</TableEmpty>}
          {!isLoading && tenants.length === 0 && (
            <TableEmpty colSpan={7}>No hay tenants todavía.</TableEmpty>
          )}
          {tenantsOrdenados.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.nombre}</TableCell>
              <TableCell>
                <Badge variant={ESTADO_VARIANT[t.estado] ?? 'neutral'} dot>
                  {ESTADO_LABEL[t.estado]}
                </Badge>
              </TableCell>
              <TableCell>
                <Select
                  value={t.plan?.id ?? ''}
                  onChange={(e) => cambiarPlan(t.id, e.target.value)}
                  disabled={updatingId === t.id}
                  className="h-8 max-w-[160px] text-xs"
                >
                  <option value="">Sin plan (sin límite)</option>
                  {planes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Select>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {t._count.users}
                {t.plan ? ` / ${t.plan.maxUsuarios}` : ''}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {t._count.puntosCompra}
                {t.plan?.maxPuntosCompra ? ` / ${t.plan.maxPuntosCompra}` : ''}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(t.createdAt).toLocaleDateString('es-CO')}
              </TableCell>
              <TableCell className="text-right">
                {t.estado === 'PENDIENTE' ? (
                  <Button
                    size="sm"
                    disabled={updatingId === t.id}
                    onClick={() => cambiarEstado(t.id, 'ACTIVO')}
                  >
                    Aprobar
                  </Button>
                ) : t.estado === 'SUSPENDIDO' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingId === t.id}
                    onClick={() => cambiarEstado(t.id, 'ACTIVO')}
                  >
                    Activar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingId === t.id}
                    onClick={() => cambiarEstado(t.id, 'SUSPENDIDO')}
                  >
                    Suspender
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
