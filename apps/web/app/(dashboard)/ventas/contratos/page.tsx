'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ContratoVenta } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';
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
import { tipoCafeVariant } from '@/lib/badge-variants';

function formatMoney(value: string) {
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

export default function ContratosVentaPage() {
  const [contratos, setContratos] = useState<ContratoVenta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ContratoVenta[]>('/contratos-venta')
      .then(setContratos)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar contratos'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contratos de venta anticipada</h1>
        <div className="flex gap-2">
          <Link href="/ventas" className={buttonVariants({ variant: 'outline' })}>
            Volver a ventas
          </Link>
          <Link href="/ventas/contratos/nuevo" className={buttonVariants()}>
            Nuevo contrato
          </Link>
        </div>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Precio fijado hoy con una trilladora/comprador para cantidad futura. Las ventas que se
        registren contra un contrato heredan su precio y descuentan del saldo pactado.
      </p>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Comprador</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Pactado</TableHead>
            <TableHead>Entregado</TableHead>
            <TableHead>Precio/kg</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={7}>Cargando…</TableEmpty>}
          {!isLoading && contratos.length === 0 && (
            <TableEmpty colSpan={7}>No hay contratos registrados.</TableEmpty>
          )}
          {contratos.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link
                  href={`/ventas/contratos/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.codigo}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{c.compradorNombre}</TableCell>
              <TableCell>
                <Badge variant={tipoCafeVariant(c.tipoCafe)}>{c.tipoCafe}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(c.cantidadKgPactada)} kg
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(c.cantidadKgEntregada)} kg
                {c.saldoPendienteKg > 0 ? ` (faltan ${c.saldoPendienteKg.toFixed(2)})` : ''}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatMoney(c.precioKg)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={ESTADO_VARIANT[c.estado] ?? 'neutral'}>
                    {ESTADO_LABEL[c.estado] ?? c.estado}
                  </Badge>
                  {c.vencido && <Badge variant="warning">Vencido</Badge>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
