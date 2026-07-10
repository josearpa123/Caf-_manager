'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { PuntoCompra } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PuntosCompraPage() {
  const [puntos, setPuntos] = useState<PuntoCompra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    api
      .get<PuntoCompra[]>('/puntos-compra')
      .then(setPuntos)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar puntos de compra'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre) {
      setError('Ingresa un nombre');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/puntos-compra', {
        nombre,
        direccion: direccion || undefined,
        telefono: telefono || undefined,
        municipio: municipio || undefined,
      });
      setNombre('');
      setDireccion('');
      setTelefono('');
      setMunicipio('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el punto de compra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActivo = async (punto: PuntoCompra) => {
    setUpdatingId(punto.id);
    setError(null);
    try {
      await api.patch(`/puntos-compra/${punto.id}`, { activo: !punto.activo });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Puntos de compra</h1>

      <form
        onSubmit={onSubmit}
        className="mt-6 flex max-w-3xl flex-wrap items-end gap-3 rounded-md border p-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="direccion">Dirección</Label>
          <Input
            id="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="municipio">Municipio</Label>
          <Input
            id="municipio"
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            className="w-36"
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 max-w-3xl overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Dirección</th>
              <th className="px-4 py-2 font-medium">Municipio</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2" />
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
            {!isLoading && puntos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No hay puntos de compra todavía.
                </td>
              </tr>
            )}
            {puntos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2 font-medium">{p.nombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.direccion ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.municipio ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {p.activo ? 'Activo' : 'Inactivo'}
                </td>
                <td className="px-4 py-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingId === p.id}
                    onClick={() => toggleActivo(p)}
                  >
                    {p.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
