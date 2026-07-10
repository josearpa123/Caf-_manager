'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Anticipo } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Anticipos a proveedores</h1>
        <div className="flex gap-2">
          <Link href="/pagos" className={buttonVariants({ variant: 'outline' })}>
            Volver a pagos
          </Link>
          <Link href="/pagos/anticipos/nuevo" className={buttonVariants()}>
            Nuevo anticipo
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Proveedor</th>
              <th className="px-4 py-2 font-medium">Punto de compra</th>
              <th className="px-4 py-2 font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && anticipos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No hay anticipos registrados.
                </td>
              </tr>
            )}
            {anticipos.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(a.fecha).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-2">
                  <Link href={`/pagos/anticipos/${a.id}`} className="font-medium hover:underline">
                    {a.proveedor.nombre}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{a.puntoCompra.nombre}</td>
                <td className="px-4 py-2 font-medium">{formatMoney(a.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
