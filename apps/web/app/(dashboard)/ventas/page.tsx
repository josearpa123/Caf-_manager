'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Venta } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Venta[]>('/ventas')
      .then(setVentas)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar ventas'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ventas</h1>
        <div className="flex gap-2">
          <Link href="/ventas/compradores" className={buttonVariants({ variant: 'outline' })}>
            Compradores
          </Link>
          <Link href="/ventas/nueva" className={buttonVariants()}>
            Nueva venta
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Comprador</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Precio/kg</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={7}>Cargando…</TableEmpty>}
          {!isLoading && ventas.length === 0 && (
            <TableEmpty colSpan={7}>No hay ventas registradas.</TableEmpty>
          )}
          {ventas.map((v) => (
            <TableRow key={v.id}>
              <TableCell>
                <Link href={`/ventas/${v.id}`} className="font-medium hover:underline">
                  {v.codigo}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(v.fecha).toLocaleDateString('es-CO')}
              </TableCell>
              <TableCell className="text-muted-foreground">{v.compradorNombre}</TableCell>
              <TableCell>
                <Badge variant={tipoCafeVariant(v.tipoCafe)}>{v.tipoCafe}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(v.cantidadKg)} kg
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatMoney(v.precioKg)}
              </TableCell>
              <TableCell className="font-medium tabular-nums">
                {formatMoney(v.valorTotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
