'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { InventarioItem, Recepcion } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { tipoCafeVariant } from '@/lib/badge-variants';

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
      <PageHeader
        title="Bodega e inventario"
        actions={
          <div className="flex gap-2">
            <Link href="/bodega/secado" className={buttonVariants({ variant: 'outline' })}>
              Secado
            </Link>
            <Link href="/bodega/trilla" className={buttonVariants({ variant: 'outline' })}>
              Trilla
            </Link>
          </div>
        }
      />

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <h2 className="mt-8 text-lg font-medium">Inventario actual</h2>
      <Table className="mt-3 max-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Punto de compra</TableHead>
            <TableHead>Tipo de café</TableHead>
            <TableHead>Cantidad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={3}>Cargando…</TableEmpty>}
          {!isLoading && inventario.length === 0 && (
            <TableEmpty colSpan={3}>Sin existencias registradas.</TableEmpty>
          )}
          {inventario.map((item) => (
            <TableRow key={`${item.puntoCompraId}-${item.tipoCafe}`}>
              <TableCell>{item.puntoCompraNombre}</TableCell>
              <TableCell>
                <Badge variant={tipoCafeVariant(item.tipoCafe)}>{item.tipoCafe}</Badge>
              </TableCell>
              <TableCell className="font-medium tabular-nums">
                {item.cantidadKg.toFixed(2)} kg
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="mt-8 text-lg font-medium">Pasilla pendiente de destino</h2>
      <p className="text-sm text-muted-foreground">
        Cada recepción de pasilla debe destinarse a mezcla con pergamino o a venta separada.
      </p>
      <Table className="mt-3 max-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Peso neto</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && pasillasPendientes.length === 0 && (
            <TableEmpty colSpan={4}>No hay pasillas pendientes.</TableEmpty>
          )}
          {pasillasPendientes.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.codigo}</TableCell>
              <TableCell className="text-muted-foreground">{p.proveedor.nombre}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(p.pesoNeto)} kg
              </TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
