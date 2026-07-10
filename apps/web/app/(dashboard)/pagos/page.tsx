'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Pago } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';

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

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Proveedor</th>
              <th className="px-4 py-2 font-medium">Recepción</th>
              <th className="px-4 py-2 font-medium">Método</th>
              <th className="px-4 py-2 font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && pagos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No hay pagos registrados.
                </td>
              </tr>
            )}
            {pagos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(p.fecha).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-2">{p.proveedor.nombre}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {p.recepcion?.codigo ?? '—'}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {METODO_LABEL[p.metodoPago] ?? p.metodoPago}
                </td>
                <td className="px-4 py-2 font-medium">{formatMoney(p.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
