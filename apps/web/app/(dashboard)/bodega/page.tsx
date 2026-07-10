'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { InventarioItem, Recepcion } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';

export default function BodegaPage() {
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [pasillasPendientes, setPasillasPendientes] = useState<Recepcion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [decidiendo, setDecidiendo] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    Promise.all([
      api.get<InventarioItem[]>('/bodega/inventario'),
      api.get<Recepcion[]>('/recepcion?tipoCafe=PASILLA'),
    ])
      .then(([inv, pasillas]) => {
        setInventario(inv);
        setPasillasPendientes(pasillas.filter((p) => !p.destinoPasilla));
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar bodega'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const decidir = async (id: string, destino: 'MEZCLA' | 'VENTA_SEPARADA') => {
    setDecidiendo(id);
    setError(null);
    try {
      await api.patch(`/bodega/pasilla/${id}/destino`, { destino });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo decidir el destino');
    } finally {
      setDecidiendo(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bodega e inventario</h1>
        <div className="flex gap-2">
          <Link href="/bodega/secado" className={buttonVariants({ variant: 'outline' })}>
            Secado
          </Link>
          <Link href="/bodega/trilla" className={buttonVariants({ variant: 'outline' })}>
            Trilla
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <h2 className="mt-8 text-lg font-medium">Inventario actual</h2>
      <div className="mt-3 max-w-2xl overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Punto de compra</th>
              <th className="px-4 py-2 font-medium">Tipo de café</th>
              <th className="px-4 py-2 font-medium">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && inventario.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Sin existencias registradas.
                </td>
              </tr>
            )}
            {inventario.map((item) => (
              <tr key={`${item.puntoCompraId}-${item.tipoCafe}`} className="border-t">
                <td className="px-4 py-2">{item.puntoCompraNombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{item.tipoCafe}</td>
                <td className="px-4 py-2 font-medium">{item.cantidadKg.toFixed(2)} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-lg font-medium">Pasilla pendiente de destino</h2>
      <p className="text-sm text-muted-foreground">
        Cada recepción de pasilla debe destinarse a mezcla con pergamino o a venta separada.
      </p>
      <div className="mt-3 max-w-2xl overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Proveedor</th>
              <th className="px-4 py-2 font-medium">Peso neto</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {!isLoading && pasillasPendientes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No hay pasillas pendientes.
                </td>
              </tr>
            )}
            {pasillasPendientes.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.codigo}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.proveedor.nombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{Number(p.pesoNeto)} kg</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={decidiendo === p.id}
                      onClick={() => decidir(p.id, 'MEZCLA')}
                    >
                      Mezclar con pergamino
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={decidiendo === p.id}
                      onClick={() => decidir(p.id, 'VENTA_SEPARADA')}
                    >
                      Vender separada
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
