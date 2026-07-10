'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ContratoVenta } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const ESTADO_LABEL: Record<string, string> = {
  VIGENTE: 'Vigente',
  CUMPLIDO: 'Cumplido',
  CANCELADO: 'Cancelado',
};

const ESTADO_VARIANT: Record<string, NonNullable<BadgeProps['variant']>> = {
  VIGENTE: 'primary',
  CUMPLIDO: 'success',
  CANCELADO: 'neutral',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function ContratoVentaDetallePage() {
  const params = useParams<{ id: string }>();
  const [contrato, setContrato] = useState<ContratoVenta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCancelando, setIsCancelando] = useState(false);

  const load = () => {
    api
      .get<ContratoVenta>(`/contratos-venta/${params.id}`)
      .then(setContrato)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el contrato'),
      );
  };

  useEffect(load, [params.id]);

  const cancelar = async () => {
    setIsCancelando(true);
    setError(null);
    try {
      await api.patch(`/contratos-venta/${params.id}/cancelar`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cancelar el contrato');
    } finally {
      setIsCancelando(false);
    }
  };

  if (error && !contrato) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!contrato) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{contrato.codigo}</h1>
          <Badge variant={ESTADO_VARIANT[contrato.estado] ?? 'neutral'}>
            {ESTADO_LABEL[contrato.estado] ?? contrato.estado}
          </Badge>
          {contrato.vencido && <Badge variant="warning">Vencido</Badge>}
        </div>
        {contrato.estado === 'VIGENTE' && contrato.saldoPendienteKg > 0 && (
          <Link
            href={`/ventas/nueva?contratoVentaId=${contrato.id}`}
            className={buttonVariants()}
          >
            Registrar entrega
          </Link>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{contrato.compradorNombre}</p>

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Field label="Tipo de café" value={contrato.tipoCafe} />
          <Field label="Punto de compra" value={contrato.puntoCompra.nombre} />
          <Field label="Precio fijo/kg" value={formatMoney(contrato.precioKg)} />
          <Field label="Cantidad pactada" value={`${Number(contrato.cantidadKgPactada)} kg`} />
          <Field label="Entregado" value={`${Number(contrato.cantidadKgEntregada)} kg`} />
          <Field label="Saldo pendiente" value={`${contrato.saldoPendienteKg.toFixed(2)} kg`} />
          {contrato.fechaLimite && (
            <Field
              label="Fecha límite"
              value={new Date(contrato.fechaLimite).toLocaleDateString('es-CO')}
            />
          )}
          {contrato.observaciones && (
            <div className="col-span-3">
              <Field label="Observaciones" value={contrato.observaciones} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Entregas registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {!contrato.ventas || contrato.ventas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin entregas todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {contrato.ventas.map((v) => (
                <li key={v.id} className="flex justify-between">
                  <Link href={`/ventas/${v.id}`} className="hover:underline">
                    {v.codigo} — {new Date(v.fecha).toLocaleDateString('es-CO')}
                  </Link>
                  <span className="text-muted-foreground">
                    {Number(v.cantidadKg)} kg — {formatMoney(v.valorTotal)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {contrato.estado === 'VIGENTE' && (
        <Card className="mt-6 max-w-xl">
          <CardContent className="flex items-center justify-between pt-6">
            <p className="text-sm text-muted-foreground">
              Cancelar detiene nuevas entregas contra este contrato. Las ya registradas quedan
              intactas.
            </p>
            <Button variant="destructive" disabled={isCancelando} onClick={cancelar}>
              {isCancelando ? 'Cancelando…' : 'Cancelar contrato'}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
