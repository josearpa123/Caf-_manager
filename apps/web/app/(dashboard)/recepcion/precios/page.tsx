'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { TablaPrecioTramo } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <h1 className="text-2xl font-semibold">Tabla de precios</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Precio absoluto por kg según tramo de factor de rendimiento y humedad. Solo aplica a café
        mojado — la pasilla tiene precio directo por recepción.
      </p>

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

      <div className="mt-6 max-w-3xl overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Factor</th>
              <th className="px-4 py-2 font-medium">Humedad</th>
              <th className="px-4 py-2 font-medium">Precio/kg</th>
              <th className="px-4 py-2 font-medium">Punto de compra</th>
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
            {!isLoading && tramos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No hay tramos definidos para esta fecha.
                </td>
              </tr>
            )}
            {tramos.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2">{t.nombre ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {Number(t.factorMin)} – {Number(t.factorMax)}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {Number(t.humedadMin)}% – {Number(t.humedadMax)}%
                </td>
                <td className="px-4 py-2 font-medium">
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0,
                  }).format(Number(t.precioKg))}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {t.puntoCompraId ? 'Específico' : 'Todos'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
