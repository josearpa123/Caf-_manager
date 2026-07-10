'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Anticipo } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatMoney(value: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function AnticiposPage() {
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Anticipo[]>('/anticipos')
      .then(setAnticipos)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar anticipos'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8">
      <PageHeader
        title="Anticipos a proveedores"
        actions={
          <div className="flex gap-2">
            <Link href="/pagos" className={buttonVariants({ variant: 'outline' })}>
              Volver a pagos
            </Link>
            <Link href="/pagos/anticipos/nuevo" className={buttonVariants()}>
              Nuevo anticipo
            </Link>
          </div>
        }
      />

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Punto de compra</TableHead>
            <TableHead>Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={4}>Cargando…</TableEmpty>}
          {!isLoading && anticipos.length === 0 && (
            <TableEmpty colSpan={4}>No hay anticipos registrados.</TableEmpty>
          )}
          {anticipos.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-muted-foreground">
                {new Date(a.fecha).toLocaleDateString('es-CO')}
              </TableCell>
              <TableCell>
                <Link href={`/pagos/anticipos/${a.id}`} className="font-medium hover:underline">
                  {a.proveedor.nombre}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{a.puntoCompra.nombre}</TableCell>
              <TableCell className="font-medium tabular-nums">{formatMoney(a.monto)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
