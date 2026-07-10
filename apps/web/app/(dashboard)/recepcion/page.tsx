'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Recepcion } from '@coffee-manager/shared-types';
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

export default function RecepcionPage() {
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Recepcion[]>('/recepcion')
      .then(setRecepciones)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar recepciones'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recepción de café</h1>
        <div className="flex gap-2">
          <Link href="/recepcion/precios" className={buttonVariants({ variant: 'outline' })}>
            Tabla de precios
          </Link>
          <Link href="/recepcion/nueva" className={buttonVariants()}>
            Nueva recepción
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Peso neto</TableHead>
            <TableHead>Precio/kg</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={7}>Cargando…</TableEmpty>}
          {!isLoading && recepciones.length === 0 && (
            <TableEmpty colSpan={7}>No hay recepciones registradas.</TableEmpty>
          )}
          {recepciones.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link href={`/recepcion/${r.id}`} className="font-medium hover:underline">
                  {r.codigo}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(r.fecha).toLocaleDateString('es-CO')}
              </TableCell>
              <TableCell className="text-muted-foreground">{r.proveedor.nombre}</TableCell>
              <TableCell>
                <Badge variant={tipoCafeVariant(r.tipoCafe)}>{r.tipoCafe}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(r.pesoNeto)} kg
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {formatMoney(r.precioKg)}
              </TableCell>
              <TableCell className="font-medium tabular-nums">
                {formatMoney(r.valorTotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
