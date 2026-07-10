'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Pago } from '@coffee-manager/shared-types';
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

function formatMoney(value: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
  CREDITO: 'Crédito',
};

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Pago[]>('/pagos')
      .then(setPagos)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar pagos'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pagos y finanzas</h1>
        <div className="flex gap-2">
          <Link href="/pagos/cuenta" className={buttonVariants({ variant: 'outline' })}>
            Estado de cuenta
          </Link>
          <Link href="/pagos/anticipos" className={buttonVariants({ variant: 'outline' })}>
            Anticipos
          </Link>
          <Link href="/pagos/nuevo" className={buttonVariants()}>
            Nuevo pago
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Recepción</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={5}>Cargando…</TableEmpty>}
          {!isLoading && pagos.length === 0 && (
            <TableEmpty colSpan={5}>No hay pagos registrados.</TableEmpty>
          )}
          {pagos.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-muted-foreground">
                {new Date(p.fecha).toLocaleDateString('es-CO')}
              </TableCell>
              <TableCell>{p.proveedor.nombre}</TableCell>
              <TableCell className="text-muted-foreground">
                {p.recepcion?.codigo ?? '—'}
              </TableCell>
              <TableCell>
                <Badge variant={p.metodoPago === 'CREDITO' ? 'warning' : 'neutral'}>
                  {METODO_LABEL[p.metodoPago] ?? p.metodoPago}
                </Badge>
              </TableCell>
              <TableCell className="font-medium tabular-nums">{formatMoney(p.monto)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
