'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Venta } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';

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

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Comprador</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Cantidad</th>
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
            {!isLoading && ventas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No hay ventas registradas.
                </td>
              </tr>
            )}
            {ventas.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-4 py-2">
                  <Link href={`/ventas/${v.id}`} className="font-medium hover:underline">
                    {v.codigo}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(v.fecha).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{v.compradorNombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{v.tipoCafe}</td>
                <td className="px-4 py-2 text-muted-foreground">{Number(v.cantidadKg)} kg</td>
                <td className="px-4 py-2 text-muted-foreground">{formatMoney(v.precioKg)}</td>
                <td className="px-4 py-2 font-medium">{formatMoney(v.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
