'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import type { ViajeDetalle, ViajeVentaResumen } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { StatCard } from '@/components/shell/stat-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CorteDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [viaje, setViaje] = useState<ViajeDetalle | null>(null);
  const [disponibles, setDisponibles] = useState<ViajeVentaResumen[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cargarDisponibles = useCallback(() => {
    api
      .get<ViajeVentaResumen[]>('/viajes/ventas-sin-asignar')
      .then(setDisponibles)
      .catch(() => setDisponibles([]));
  }, []);

  const cargarViaje = useCallback(() => {
    api
      .get<ViajeDetalle>(`/viajes/${id}`)
      .then(setViaje)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el corte'),
      );
  }, [id]);

  useEffect(() => {
    cargarViaje();
    cargarDisponibles();
  }, [cargarViaje, cargarDisponibles]);

  const abierto = viaje?.estado === 'ABIERTO';

  const toggle = (ventaId: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(ventaId)) next.delete(ventaId);
      else next.add(ventaId);
      return next;
    });
  };

  const agregar = async () => {
    if (seleccion.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const actualizado = await api.post<ViajeDetalle>(`/viajes/${id}/ventas`, {
        ventaIds: Array.from(seleccion),
      });
      setViaje(actualizado);
      setSeleccion(new Set());
      cargarDisponibles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron agregar las ventas');
    } finally {
      setBusy(false);
    }
  };

  const quitar = async (ventaId: string) => {
    setBusy(true);
    setError(null);
    try {
      const actualizado = await api.delete<ViajeDetalle>(`/viajes/${id}/ventas/${ventaId}`);
      setViaje(actualizado);
      cargarDisponibles();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo quitar la venta');
    } finally {
      setBusy(false);
    }
  };

  const cambiarEstado = async (estado: 'ABIERTO' | 'CERRADO') => {
    setBusy(true);
    setError(null);
    try {
      const actualizado = await api.patch<ViajeDetalle>(`/viajes/${id}`, { estado });
      setViaje(actualizado);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setBusy(false);
    }
  };

  const eliminar = async () => {
    if (!confirm('¿Eliminar este corte? Las ventas quedarán sin corte asignado.')) return;
    setBusy(true);
    try {
      await api.delete(`/viajes/${id}`);
      router.push('/cortes');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el corte');
      setBusy(false);
    }
  };

  if (!viaje) {
    return (
      <div className="p-8">
        <Link href="/cortes" className="text-sm text-muted-foreground hover:underline">
          ← Volver a cortes
        </Link>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {!error && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link
        href="/cortes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a cortes
      </Link>

      <PageHeader
        title={viaje.codigo}
        description={`Despacho del ${formatDate(viaje.fecha)}${
          viaje.destino ? ` · ${viaje.destino}` : ''
        }${viaje.placa ? ` · ${viaje.placa}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={abierto ? 'success' : 'neutral'}>
              {abierto ? 'Abierto' : 'Cerrado'}
            </Badge>
            {abierto ? (
              <Button variant="outline" onClick={() => cambiarEstado('CERRADO')} disabled={busy}>
                Cerrar corte
              </Button>
            ) : (
              <Button variant="outline" onClick={() => cambiarEstado('ABIERTO')} disabled={busy}>
                Reabrir
              </Button>
            )}
            <Button variant="outline" onClick={eliminar} disabled={busy}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        }
      />

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 grid max-w-3xl grid-cols-3 gap-4">
        <StatCard label="Ventas en el corte" value={String(viaje.ventas.length)} />
        <StatCard label="Total despachado" value={`${viaje.totalKg.toFixed(2)} kg`} />
        <StatCard label="Valor total" value={formatMoney(viaje.totalValor)} />
      </div>

      <h2 className="mt-8 text-lg font-medium">Ventas incluidas</h2>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>Venta</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Comprador</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Kg</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            {abierto && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {viaje.ventas.length === 0 && (
            <TableEmpty colSpan={abierto ? 7 : 6}>
              Sin ventas. Agrega ventas desde la lista de abajo.
            </TableEmpty>
          )}
          {viaje.ventas.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.codigo}</TableCell>
              <TableCell>{formatDate(v.fecha)}</TableCell>
              <TableCell>{v.compradorNombre}</TableCell>
              <TableCell>
                <Badge variant={tipoCafeVariant(v.tipoCafe)}>{v.tipoCafe}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{v.cantidadKg.toFixed(2)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatMoney(v.valorTotal)}
              </TableCell>
              {abierto && (
                <TableCell>
                  <button
                    type="button"
                    onClick={() => quitar(v.id)}
                    disabled={busy}
                    aria-label="Quitar venta"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {abierto && (
        <>
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-lg font-medium">Agregar ventas sin corte</h2>
            {seleccion.size > 0 && (
              <Button onClick={agregar} disabled={busy}>
                <Plus className="h-4 w-4" />
                Agregar {seleccion.size} venta{seleccion.size === 1 ? '' : 's'}
              </Button>
            )}
          </div>
          <Card className="mt-3">
            <CardContent className="pt-6">
              {disponibles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay ventas sin corte asignado. Registra ventas en la sección Ventas.
                </p>
              ) : (
                <div className="flex flex-col divide-y">
                  {disponibles.map((v) => (
                    <label
                      key={v.id}
                      className="flex cursor-pointer items-center gap-3 py-2.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={seleccion.has(v.id)}
                        onChange={() => toggle(v.id)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <span className="w-28 font-medium">{v.codigo}</span>
                      <span className="w-24 text-muted-foreground">{formatDate(v.fecha)}</span>
                      <span className="flex-1 truncate">{v.compradorNombre}</span>
                      <Badge variant={tipoCafeVariant(v.tipoCafe)}>{v.tipoCafe}</Badge>
                      <span className="w-24 text-right tabular-nums">
                        {v.cantidadKg.toFixed(2)} kg
                      </span>
                      <span className="w-28 text-right font-medium tabular-nums">
                        {formatMoney(v.valorTotal)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="mt-8">
        <Link href="/reportes" className={buttonVariants({ variant: 'outline' })}>
          Ver reportes por cortes
        </Link>
      </div>
    </div>
  );
}
