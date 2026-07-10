'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import type { Factura } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';

function formatMoney(value: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EMITIDA: 'Emitida',
  ANULADA: 'Anulada',
  ERROR: 'Error al emitir',
};

const ESTADO_VARIANT: Record<string, NonNullable<BadgeProps['variant']>> = {
  PENDIENTE: 'neutral',
  EMITIDA: 'success',
  ANULADA: 'outline',
  ERROR: 'destructive',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function FacturaDetallePage() {
  const params = useParams<{ id: string }>();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEmitiendo, setIsEmitiendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [isAnulando, setIsAnulando] = useState(false);

  const load = () => {
    api
      .get<Factura>(`/facturacion/${params.id}`)
      .then(setFactura)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la factura'),
      );
  };

  useEffect(load, [params.id]);

  const emitir = async () => {
    setIsEmitiendo(true);
    setError(null);
    try {
      await api.post(`/facturacion/${params.id}/emitir`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo emitir la factura');
      load();
    } finally {
      setIsEmitiendo(false);
    }
  };

  const anular = async (e: FormEvent) => {
    e.preventDefault();
    if (!motivo) {
      setError('Ingresa el motivo de anulación');
      return;
    }
    setIsAnulando(true);
    setError(null);
    try {
      await api.post(`/facturacion/${params.id}/anular`, { motivo });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo anular la factura');
    } finally {
      setIsAnulando(false);
    }
  };

  if (error && !factura) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!factura) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Factura — {factura.recepcion.codigo}</h1>
        <Badge variant={ESTADO_VARIANT[factura.estado] ?? 'neutral'}>
          {ESTADO_LABEL[factura.estado] ?? factura.estado}
        </Badge>
      </div>

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Proveedor (caficultor)" value={factura.recepcion.proveedor.nombre} />
          <Field label="Punto de compra" value={factura.puntoCompra.nombre} />
          <Field label="Valor de la recepción" value={formatMoney(factura.recepcion.valorTotal)} />
          <Field label="Proveedor tecnológico" value={factura.proveedorTecnologico} />
          {factura.numero && <Field label="Número" value={factura.numero} />}
          {factura.cufe && <Field label="CUFE" value={factura.cufe} />}
          {factura.motivoAnulacion && (
            <div className="col-span-2">
              <Field label="Motivo de anulación" value={factura.motivoAnulacion} />
            </div>
          )}
        </CardContent>
      </Card>

      {(factura.estado === 'PENDIENTE' || factura.estado === 'ERROR') && (
        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle>Emitir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Requiere un proveedor tecnológico conectado (Factus/Siigo). Mientras no exista,
              esta acción va a fallar con un mensaje explicando por qué.
            </p>
            <Button className="mt-4" disabled={isEmitiendo} onClick={emitir}>
              {isEmitiendo ? 'Emitiendo…' : 'Emitir factura'}
            </Button>
          </CardContent>
        </Card>
      )}

      {factura.estado === 'EMITIDA' && (
        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle>Anular</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={anular} className="flex items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="motivo">Motivo</Label>
                <Input
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <Button type="submit" variant="destructive" disabled={isAnulando}>
                {isAnulando ? 'Anulando…' : 'Anular factura'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
