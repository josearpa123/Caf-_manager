'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { PuntoCompra, TrillaProceso } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function TrillaPage() {
  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [trillas, setTrillas] = useState<TrillaProceso[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [pesoPergaminoKg, setPesoPergaminoKg] = useState('');
  const [pesoAlmendraKg, setPesoAlmendraKg] = useState('');
  const [pesoSubproductoKg, setPesoSubproductoKg] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    api
      .get<TrillaProceso[]>('/bodega/trilla')
      .then(setTrillas)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar procesos de trilla'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    api.get<PuntoCompra[]>('/puntos-compra').then(setPuntosCompra).catch(() => {});
    load();
  }, []);

  const rendimiento =
    pesoPergaminoKg && pesoAlmendraKg
      ? ((Number(pesoAlmendraKg) / Number(pesoPergaminoKg)) * 100).toFixed(2)
      : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!puntoCompraId || !pesoPergaminoKg || !pesoAlmendraKg) {
      setError('Completa punto de compra, peso de pergamino y peso de almendra');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/bodega/trilla', {
        puntoCompraId,
        pesoPergaminoKg: Number(pesoPergaminoKg),
        pesoAlmendraKg: Number(pesoAlmendraKg),
        pesoSubproductoKg: pesoSubproductoKg ? Number(pesoSubproductoKg) : undefined,
        observaciones: observaciones || undefined,
      });
      setPesoPergaminoKg('');
      setPesoAlmendraKg('');
      setPesoSubproductoKg('');
      setObservaciones('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la trilla');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Trilla</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Consume pergamino disponible en el punto de compra y genera almendra.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid max-w-2xl grid-cols-2 gap-4">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="puntoCompraId">Punto de compra</Label>
          <Select
            id="puntoCompraId"
            value={puntoCompraId}
            onChange={(e) => setPuntoCompraId(e.target.value)}
            required
          >
            <option value="">Selecciona…</option>
            {puntosCompra.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pesoPergaminoKg">Peso pergamino (kg)</Label>
          <Input
            id="pesoPergaminoKg"
            type="number"
            step="0.01"
            value={pesoPergaminoKg}
            onChange={(e) => setPesoPergaminoKg(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pesoAlmendraKg">Peso almendra (kg)</Label>
          <Input
            id="pesoAlmendraKg"
            type="number"
            step="0.01"
            value={pesoAlmendraKg}
            onChange={(e) => setPesoAlmendraKg(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pesoSubproductoKg">Subproducto (broza/cisco, kg)</Label>
          <Input
            id="pesoSubproductoKg"
            type="number"
            step="0.01"
            value={pesoSubproductoKg}
            onChange={(e) => setPesoSubproductoKg(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Rendimiento</Label>
          <p className="flex h-9 items-center text-sm font-medium">{rendimiento ? `${rendimiento}%` : '—'}</p>
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Input
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Registrar trilla'}
          </Button>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-8 max-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Punto de compra</TableHead>
            <TableHead>Pergamino</TableHead>
            <TableHead>Almendra</TableHead>
            <TableHead>Rendimiento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={5}>Cargando…</TableEmpty>}
          {!isLoading && trillas.length === 0 && (
            <TableEmpty colSpan={5}>No hay procesos de trilla registrados.</TableEmpty>
          )}
          {trillas.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.codigo}</TableCell>
              <TableCell className="text-muted-foreground">{t.puntoCompra.nombre}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(t.pesoPergaminoKg)} kg
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(t.pesoAlmendraKg)} kg
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {Number(t.rendimientoPorcentaje)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
