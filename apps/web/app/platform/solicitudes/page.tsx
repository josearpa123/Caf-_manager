'use client';

import { useEffect, useState } from 'react';
import { Building2, Check, Mail, Phone, X } from 'lucide-react';
import type { Plan, PlatformTenant } from '@coffee-manager/shared-types';
import { platformApi, ApiError } from '@/lib/platform-api';
import { PageHeader } from '@/components/shell/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Decision = 'ACTIVO' | 'RECHAZADO';

export default function SolicitudesPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [planSeleccionado, setPlanSeleccionado] = useState<Record<string, string>>({});
  const [decision, setDecision] = useState<{ tenant: PlatformTenant; estado: Decision } | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      platformApi.get<PlatformTenant[]>('/platform/tenants'),
      platformApi.get<Plan[]>('/platform/planes'),
    ])
      .then(([t, p]) => {
        setTenants(t);
        setPlanes(p);
        setPlanSeleccionado((prev) => {
          const next = { ...prev };
          for (const tenant of t) {
            if (!(tenant.id in next)) next[tenant.id] = tenant.plan?.id ?? '';
          }
          return next;
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const solicitudes = tenants.filter((t) => t.estado === 'PENDIENTE');

  const confirmarDecision = async () => {
    if (!decision) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await platformApi.patch(`/platform/tenants/${decision.tenant.id}`, {
        estado: decision.estado,
        planId:
          decision.estado === 'ACTIVO'
            ? planSeleccionado[decision.tenant.id] || null
            : undefined,
      });
      setDecision(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Solicitudes de registro"
        description="Cuentas creadas desde la página pública, a la espera de revisión. Al aprobar quedan activas con el plan elegido (o el que ajustes aquí)."
      />

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : solicitudes.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
              <Check className="h-5 w-5" />
            </span>
            <p className="font-display text-lg">No hay solicitudes pendientes</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Cuando alguien se registre desde la página pública, su solicitud aparecerá aquí
              para que la apruebes o la rechaces.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {solicitudes.map((t) => (
            <Card key={t.id} className="border-primary/20">
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <p className="font-display text-base leading-tight">{t.nombre}</p>
                      {t.nit && <p className="text-xs text-muted-foreground">NIT {t.nit}</p>}
                    </div>
                  </div>
                  <Badge variant="primary" dot>
                    Pendiente
                  </Badge>
                </div>

                <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t.contacto?.email ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t.contacto?.telefono || t.telefono || '—'}</span>
                  </div>
                  <div className="text-muted-foreground sm:col-span-2">
                    Solicitado por <span className="text-foreground">{t.contacto?.nombre ?? '—'}</span>{' '}
                    el {new Date(t.createdAt).toLocaleDateString('es-CO')}
                  </div>
                </dl>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`plan-${t.id}`}>Plan a asignar</Label>
                  <Select
                    id={`plan-${t.id}`}
                    value={planSeleccionado[t.id] ?? ''}
                    onChange={(e) =>
                      setPlanSeleccionado((prev) => ({ ...prev, [t.id]: e.target.value }))
                    }
                  >
                    <option value="">Sin plan (sin límite)</option>
                    {planes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — hasta {p.maxUsuarios} usuarios
                        {p.maxPuntosCompra ? `, ${p.maxPuntosCompra} puntos de compra` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center gap-2 border-t border-border/70 pt-3.5">
                  <Button
                    className="flex-1"
                    onClick={() => setDecision({ tenant: t, estado: 'ACTIVO' })}
                  >
                    <Check className="h-4 w-4" />
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDecision({ tenant: t, estado: 'RECHAZADO' })}
                  >
                    <X className="h-4 w-4" />
                    Rechazar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!decision} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent>
          <DialogHeader onClose={() => setDecision(null)}>
            <DialogTitle>
              {decision?.estado === 'ACTIVO' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
            </DialogTitle>
            <DialogDescription>
              {decision?.estado === 'ACTIVO' ? (
                <>
                  <strong className="text-foreground">{decision?.tenant.nombre}</strong> quedará
                  activo con el plan{' '}
                  <strong className="text-foreground">
                    {planes.find((p) => p.id === (decision && planSeleccionado[decision.tenant.id]))
                      ?.nombre ?? 'sin límite'}
                  </strong>{' '}
                  y podrá iniciar sesión de inmediato.
                </>
              ) : (
                <>
                  <strong className="text-foreground">{decision?.tenant.nombre}</strong> no podrá
                  iniciar sesión. Puedes revertir esto más adelante desde Tenants si cambias de
                  opinión.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogBody />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant={decision?.estado === 'RECHAZADO' ? 'destructive' : 'default'}
              onClick={confirmarDecision}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Guardando…'
                : decision?.estado === 'ACTIVO'
                  ? 'Confirmar aprobación'
                  : 'Confirmar rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
