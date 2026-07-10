'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Factura } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Facturación electrónica</h1>
        <Link href="/facturacion/nueva" className={buttonVariants()}>
          Generar factura
        </Link>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        No hay un proveedor tecnológico conectado todavía (Factus/Siigo, decisión pendiente). Se
        puede dejar el registro de la factura listo, pero la emisión real ante la DIAN fallará
        con un mensaje claro hasta que se conecte un proveedor.
      </p>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Recepción</th>
              <th className="px-4 py-2 font-medium">Proveedor</th>
              <th className="px-4 py-2 font-medium">Punto de compra</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Estado</th>
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
            {!isLoading && facturas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No hay facturas registradas.
                </td>
              </tr>
            )}
            {facturas.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-4 py-2">
                  <Link href={`/facturacion/${f.id}`} className="font-medium hover:underline">
                    {f.recepcion.codigo}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{f.recepcion.proveedor.nombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{f.puntoCompra.nombre}</td>
                <td className="px-4 py-2 font-medium">{formatMoney(f.recepcion.valorTotal)}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {ESTADO_LABEL[f.estado] ?? f.estado}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
