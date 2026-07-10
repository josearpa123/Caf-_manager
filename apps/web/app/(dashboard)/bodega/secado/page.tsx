'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProcesoSecado } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';

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

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Punto de compra</th>
              <th className="px-4 py-2 font-medium">Mojado</th>
              <th className="px-4 py-2 font-medium">Seco resultante</th>
              <th className="px-4 py-2 font-medium">Rendimiento</th>
              <th className="px-4 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && procesos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No hay procesos de secado registrados.
                </td>
              </tr>
            )}
            {procesos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">
                  <Link href={`/bodega/secado/${p.id}`} className="font-medium hover:underline">
                    {p.codigo}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{p.puntoCompra.nombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{Number(p.pesoMojadoTotalKg)} kg</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {p.pesoSecoResultanteKg ? `${Number(p.pesoSecoResultanteKg)} kg` : '—'}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {p.rendimientoPorcentaje ? `${Number(p.rendimientoPorcentaje)}%` : '—'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      p.estado === 'FINALIZADO'
                        ? 'rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary'
                        : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                    }
                  >
                    {p.estado === 'FINALIZADO' ? 'Finalizado' : 'En proceso'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
