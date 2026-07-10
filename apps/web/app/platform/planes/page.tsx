'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Plan } from '@coffee-manager/shared-types';
import { platformApi, ApiError } from '@/lib/platform-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [maxUsuarios, setMaxUsuarios] = useState('');
  const [maxPuntosCompra, setMaxPuntosCompra] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    platformApi
      .get<Plan[]>('/platform/planes')
      .then(setPlanes)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar planes'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre || !maxUsuarios) {
      setError('Completa nombre y máximo de usuarios');
      return;
    }

    setIsSubmitting(true);
    try {
      await platformApi.post('/platform/planes', {
        nombre,
        maxUsuarios: Number(maxUsuarios),
        maxPuntosCompra: maxPuntosCompra ? Number(maxPuntosCompra) : undefined,
      });
      setNombre('');
      setMaxUsuarios('');
      setMaxPuntosCompra('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Planes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Definen los límites de uso que se pueden asignar a un tenant (usuarios y puntos de
        compra). Un tenant sin plan asignado no tiene límite.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex max-w-2xl items-end gap-3 rounded-md border p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxUsuarios">Máx. usuarios</Label>
          <Input
            id="maxUsuarios"
            type="number"
            step="1"
            value={maxUsuarios}
            onChange={(e) => setMaxUsuarios(e.target.value)}
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxPuntosCompra">Máx. puntos de compra (opcional)</Label>
          <Input
            id="maxPuntosCompra"
            type="number"
            step="1"
            value={maxPuntosCompra}
            onChange={(e) => setMaxPuntosCompra(e.target.value)}
            className="w-32"
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear plan'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 max-w-2xl overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Máx. usuarios</th>
              <th className="px-4 py-2 font-medium">Máx. puntos de compra</th>
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
            {!isLoading && planes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  No hay planes todavía.
                </td>
              </tr>
            )}
            {planes.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2 font-medium">{p.nombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.maxUsuarios}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {p.maxPuntosCompra ?? 'Sin límite'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
