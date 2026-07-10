'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { TablaPrecioTramo } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const today = () => new Date().toISOString().slice(0, 10);

export default function TablaPreciosPage() {
  const [fecha, setFecha] = useState(today());
  const [tramos, setTramos] = useState<TablaPrecioTramo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [nombre, setNombre] = useState('');
  const [factorMin, setFactorMin] = useState('');
  const [factorMax, setFactorMax] = useState('');
  const [humedadMin, setHumedadMin] = useState('');
  const [humedadMax, setHumedadMax] = useState('');
  const [precioKg, setPrecioKg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    api
      .get<TablaPrecioTramo[]>(`/tabla-precios?fecha=${fecha}`)
      .then(setTramos)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar la tabla de precios'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [fecha]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/tabla-precios', {
        fecha,
        nombre: nombre || undefined,
        factorMin: Number(factorMin),
        factorMax: Number(factorMax),
        humedadMin: Number(humedadMin),
        humedadMax: Number(humedadMax),
        precioKg: Number(precioKg),
      });
      setNombre('');
      setFactorMin('');
      setFactorMax('');
      setHumedadMin('');
      setHumedadMax('');
      setPrecioKg('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el tramo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Tabla de precios"
        description="Precio absoluto por kg según tramo de factor de rendimiento y humedad. Solo aplica a recepciones de pergamino seco — mojado y pasilla tienen precio directo negociado."
      />

      <div className="mt-6 flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid max-w-3xl grid-cols-6 items-end gap-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="nombre">Nombre (opcional)</Label>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="factorMin">Factor mín.</Label>
          <Input
            id="factorMin"
            type="number"
            step="0.01"
            value={factorMin}
            onChange={(e) => setFactorMin(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="factorMax">Factor máx.</Label>
          <Input
            id="factorMax"
            type="number"
            step="0.01"
            value={factorMax}
            onChange={(e) => setFactorMax(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="humedadMin">Humedad mín.</Label>
          <Input
            id="humedadMin"
            type="number"
            step="0.01"
            value={humedadMin}
            onChange={(e) => setHumedadMin(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="humedadMax">Humedad máx.</Label>
          <Input
            id="humedadMax"
            type="number"
            step="0.01"
            value={humedadMax}
            onChange={(e) => setHumedadMax(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="precioKg">Precio/kg</Label>
          <Input
            id="precioKg"
            type="number"
            step="1"
            value={precioKg}
            onChange={(e) => setPrecioKg(e.target.value)}
            required
          />
        </div>
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Agregar tramo'}
          </Button>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6 max-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Factor</TableHead>
            <TableHead>Humedad</TableHead>
            <TableHead>Precio/kg</TableHead>
            <TableHead>Punto de compra</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={5}>Cargando…</TableEmpty>}
          {!isLoading && tramos.length === 0 && (
            <TableEmpty colSpan={5}>No hay tramos definidos para esta fecha.</TableEmpty>
          )}
          {tramos.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.nombre ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(t.factorMin)} – {Number(t.factorMax)}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(t.humedadMin)}% – {Number(t.humedadMax)}%
              </TableCell>
              <TableCell className="font-medium tabular-nums">
                {new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  maximumFractionDigits: 0,
                }).format(Number(t.precioKg))}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {t.puntoCompraId ? 'Específico' : 'Todos'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
