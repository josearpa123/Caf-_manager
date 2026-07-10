'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProcesoSecado } from '@coffee-manager/shared-types';
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

export default function SecadoPage() {
  const [procesos, setProcesos] = useState<ProcesoSecado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<ProcesoSecado[]>('/bodega/secado')
      .then(setProcesos)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar procesos de secado'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Procesos de secado</h1>
        <Link href="/bodega/secado/nuevo" className={buttonVariants()}>
          Nuevo proceso
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Punto de compra</TableHead>
            <TableHead>Mojado</TableHead>
            <TableHead>Seco resultante</TableHead>
            <TableHead>Rendimiento</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={6}>Cargando…</TableEmpty>}
          {!isLoading && procesos.length === 0 && (
            <TableEmpty colSpan={6}>No hay procesos de secado registrados.</TableEmpty>
          )}
          {procesos.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link href={`/bodega/secado/${p.id}`} className="font-medium hover:underline">
                  {p.codigo}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{p.puntoCompra.nombre}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(p.pesoMojadoTotalKg)} kg
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {p.pesoSecoResultanteKg ? `${Number(p.pesoSecoResultanteKg)} kg` : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {p.rendimientoPorcentaje ? `${Number(p.rendimientoPorcentaje)}%` : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={p.estado === 'FINALIZADO' ? 'success' : 'warning'} dot>
                  {p.estado === 'FINALIZADO' ? 'Finalizado' : 'En proceso'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
