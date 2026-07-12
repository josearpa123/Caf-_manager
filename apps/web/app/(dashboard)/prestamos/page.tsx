'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Prestamo } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
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

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

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

export default function PrestamosPage() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Prestamo[]>('/prestamos')
      .then(setPrestamos)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar préstamos'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8">
      <PageHeader
        title="Préstamos a proveedores"
        description="Financiación en dinero al caficultor, sin interés. El proveedor la devuelve con abonos en efectivo o transferencia."
        actions={
          <Link href="/prestamos/nuevo" className={buttonVariants()}>
            Nuevo préstamo
          </Link>
        }
      />

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Saldo pendiente</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={6}>Cargando…</TableEmpty>}
          {!isLoading && prestamos.length === 0 && (
            <TableEmpty colSpan={6}>No hay préstamos registrados.</TableEmpty>
          )}
          {prestamos.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link href={`/prestamos/${p.id}`} className="font-medium hover:underline">
                  {p.codigo}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(p.fecha).toLocaleDateString('es-CO')}
              </TableCell>
              <TableCell>{p.proveedor.nombre}</TableCell>
              <TableCell className="font-medium tabular-nums">{formatMoney(p.monto)}</TableCell>
              <TableCell className="tabular-nums">{formatMoney(p.saldoPendiente)}</TableCell>
              <TableCell>
                <Badge variant={ESTADO_VARIANT[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
