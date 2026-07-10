'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { EstadoTenant, Plan, PlatformTenant } from '@coffee-manager/shared-types';
import { platformApi, ApiError } from '@/lib/platform-api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  PRUEBA: 'Prueba',
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

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Usuarios</th>
              <th className="px-4 py-2 font-medium">Puntos de compra</th>
              <th className="px-4 py-2 font-medium">Creado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No hay tenants todavía.
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2 font-medium">{t.nombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{ESTADO_LABEL[t.estado]}</td>
                <td className="px-4 py-2">
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
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {t._count.users}
                  {t.plan ? ` / ${t.plan.maxUsuarios}` : ''}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {t._count.puntosCompra}
                  {t.plan?.maxPuntosCompra ? ` / ${t.plan.maxPuntosCompra}` : ''}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-2 text-right">
                  {t.estado === 'SUSPENDIDO' ? (
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
