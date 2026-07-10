'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Recepcion } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';

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

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Proveedor</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Peso neto</th>
              <th className="px-4 py-2 font-medium">Precio/kg</th>
              <th className="px-4 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && recepciones.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No hay recepciones registradas.
                </td>
              </tr>
            )}
            {recepciones.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">
                  <Link href={`/recepcion/${r.id}`} className="font-medium hover:underline">
                    {r.codigo}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(r.fecha).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{r.proveedor.nombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.tipoCafe}</td>
                <td className="px-4 py-2 text-muted-foreground">{Number(r.pesoNeto)} kg</td>
                <td className="px-4 py-2 text-muted-foreground">{formatMoney(r.precioKg)}</td>
                <td className="px-4 py-2 font-medium">{formatMoney(r.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
