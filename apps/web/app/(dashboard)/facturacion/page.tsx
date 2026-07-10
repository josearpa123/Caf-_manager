'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import type { Factura } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
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
  ERROR: 'Error',
};

const ESTADO_VARIANT: Record<string, NonNullable<BadgeProps['variant']>> = {
  PENDIENTE: 'neutral',
  EMITIDA: 'success',
  ANULADA: 'outline',
  ERROR: 'destructive',
};

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Factura[]>('/facturacion')
      .then(setFacturas)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar facturas'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8">
      <PageHeader
        title="Facturación electrónica"
        actions={
          <Link href="/facturacion/nueva" className={buttonVariants()}>
            Generar factura
          </Link>
        }
      />
      <div className="mt-4 flex max-w-2xl items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-foreground/80">
          No hay un proveedor tecnológico conectado todavía (Factus/Siigo, decisión pendiente). Se
          puede dejar el registro de la factura listo, pero la emisión real ante la DIAN fallará
          con un mensaje claro hasta que se conecte un proveedor.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Recepción</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Punto de compra</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={5}>Cargando…</TableEmpty>}
          {!isLoading && facturas.length === 0 && (
            <TableEmpty colSpan={5}>No hay facturas registradas.</TableEmpty>
          )}
          {facturas.map((f) => (
            <TableRow key={f.id}>
              <TableCell>
                <Link href={`/facturacion/${f.id}`} className="font-medium hover:underline">
                  {f.recepcion.codigo}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{f.recepcion.proveedor.nombre}</TableCell>
              <TableCell className="text-muted-foreground">{f.puntoCompra.nombre}</TableCell>
              <TableCell className="font-medium tabular-nums">
                {formatMoney(f.recepcion.valorTotal)}
              </TableCell>
              <TableCell>
                <Badge variant={ESTADO_VARIANT[f.estado] ?? 'neutral'}>
                  {ESTADO_LABEL[f.estado] ?? f.estado}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
