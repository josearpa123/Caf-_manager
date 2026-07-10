'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Venta } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatMoney(value: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function VentaDetallePage() {
  const params = useParams<{ id: string }>();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Venta>(`/ventas/${params.id}`)
      .then(setVenta)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la venta'),
      );
  }, [params.id]);

  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!venta) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="p-8">
      <PageHeader
        title={venta.codigo}
        description={new Date(venta.fecha).toLocaleString('es-CO')}
      />

      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Comprador" value={venta.compradorNombre} />
          <Field label="Punto de compra" value={venta.puntoCompra.nombre} />
          <Field label="Tipo de café" value={venta.tipoCafe} />
          <Field label="Cantidad" value={`${Number(venta.cantidadKg)} kg`} />
          <Field label="Precio por kg" value={formatMoney(venta.precioKg)} />
          <Field label="Valor total" value={formatMoney(venta.valorTotal)} />
          {venta.observaciones && (
            <div className="col-span-2">
              <Field label="Observaciones" value={venta.observaciones} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Lotes de origen (trazabilidad)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm">
            {venta.lotesOrigen?.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>
                  {l.recepcion.codigo} — {l.recepcion.proveedor.nombre}
                </span>
                <span className="text-muted-foreground">
                  {Number(l.cantidadKgAtribuida)} kg
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
