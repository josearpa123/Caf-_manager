'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import type { PrestamoDetalle } from '@coffee-manager/shared-types';
import { MetodoPago } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const METODOS_ABONO = [MetodoPago.EFECTIVO, MetodoPago.TRANSFERENCIA, MetodoPago.CHEQUE];

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
};

const ESTADO_LABEL: Record<string, string> = {
  VIGENTE: 'Vigente',
  PAGADO: 'Pagado',
  CANCELADO: 'Cancelado',
};

const ESTADO_VARIANT = {
  VIGENTE: 'primary',
  PAGADO: 'success',
  CANCELADO: 'neutral',
} as const;

export default function PrestamoDetallePage() {
  const params = useParams<{ id: string }>();
  const [prestamo, setPrestamo] = useState<PrestamoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<string>(MetodoPago.EFECTIVO);
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = () => {
    api
      .get<PrestamoDetalle>(`/prestamos/${params.id}`)
      .then(setPrestamo)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el préstamo'),
      );
  };

  useEffect(load, [params.id]);

  const onAbonar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!prestamo) return;
    if (!monto) {
      setError('Indica el monto del abono');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/prestamos/${prestamo.id}/abonos`, {
        monto: Number(monto),
        metodoPago,
        referencia: referencia || undefined,
        notas: notas || undefined,
      });
      setMonto('');
      setReferencia('');
      setNotas('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el abono');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancelar = async () => {
    if (!prestamo) return;
    if (!window.confirm('¿Cancelar este préstamo? El saldo pendiente quedará sin cobrar.')) return;
    setError(null);
    setIsCancelling(true);
    try {
      await api.patch(`/prestamos/${prestamo.id}/cancelar`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cancelar el préstamo');
    } finally {
      setIsCancelling(false);
    }
  };

  if (error && !prestamo) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!prestamo) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="p-8">
      <PageHeader
        title={`Préstamo ${prestamo.codigo}`}
        description={`${prestamo.proveedor.nombre} · ${new Date(prestamo.fecha).toLocaleDateString('es-CO')} · ${prestamo.puntoCompra.nombre}`}
        actions={
          prestamo.estado === 'VIGENTE' ? (
            <Button variant="outline" onClick={onCancelar} disabled={isCancelling}>
              {isCancelling ? 'Cancelando…' : 'Cancelar préstamo'}
            </Button>
          ) : (
            <Badge variant={ESTADO_VARIANT[prestamo.estado]}>{ESTADO_LABEL[prestamo.estado]}</Badge>
          )
        }
      />

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Monto</p>
            <p className="text-sm font-medium">{formatMoney(prestamo.monto)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Abonado</p>
            <p className="text-sm font-medium">{formatMoney(prestamo.totalAbonado)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className="text-sm font-medium">{formatMoney(prestamo.saldoPendiente)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estado</p>
            <Badge variant={ESTADO_VARIANT[prestamo.estado]}>
              {ESTADO_LABEL[prestamo.estado]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Abonos</CardTitle>
        </CardHeader>
        <CardContent>
          {prestamo.abonos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin abonos todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {prestamo.abonos.map((a) => (
                <li key={a.id} className="flex justify-between">
                  <span>
                    {new Date(a.fecha).toLocaleDateString('es-CO')} · {METODO_LABEL[a.metodoPago] ?? a.metodoPago}
                    {a.notas ? ` — ${a.notas}` : ''}
                  </span>
                  <span className="font-medium tabular-nums">{formatMoney(a.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {prestamo.estado === 'VIGENTE' && prestamo.saldoPendiente > 0 && (
        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle>Registrar abono</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onAbonar} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monto">Monto</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="1"
                    max={prestamo.saldoPendiente}
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="metodoPago">Método de pago</Label>
                  <Select
                    id="metodoPago"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    {METODOS_ABONO.map((m) => (
                      <option key={m} value={m}>
                        {METODO_LABEL[m]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="referencia">Referencia (opcional)</Label>
                <Input
                  id="referencia"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notas">Notas (opcional)</Label>
                <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>

              <div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando…' : 'Registrar abono'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
