'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Proveedor } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [q, setQ] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (soloActivos) params.set('activo', 'true');
      const data = await api.get<Proveedor[]>(`/proveedores?${params.toString()}`);
      setProveedores(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar proveedores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, soloActivos]);

  const toggleActivo = async (proveedor: Proveedor) => {
    try {
      if (proveedor.activo) {
        await api.delete(`/proveedores/${proveedor.id}`);
      } else {
        await api.patch(`/proveedores/${proveedor.id}/reactivar`);
      }
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el proveedor');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Proveedores</h1>
        <Link href="/proveedores/nuevo" className={buttonVariants()}>
          Nuevo proveedor
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Input
          placeholder="Buscar por nombre o identificación…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => setSoloActivos(e.target.checked)}
          />
          Solo activos
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Identificación</th>
              <th className="px-4 py-2 font-medium">Municipio</th>
              <th className="px-4 py-2 font-medium">Teléfono</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && proveedores.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No hay proveedores registrados.
                </td>
              </tr>
            )}
            {proveedores.map((proveedor) => (
              <tr key={proveedor.id} className="border-t">
                <td className="px-4 py-2">
                  <Link
                    href={`/proveedores/${proveedor.id}`}
                    className="font-medium hover:underline"
                  >
                    {proveedor.nombre}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {proveedor.tipoIdentificacion} {proveedor.numeroIdentificacion}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {proveedor.municipio ?? '—'}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {proveedor.telefono ?? '—'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      proveedor.activo
                        ? 'rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary'
                        : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                    }
                  >
                    {proveedor.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggleActivo(proveedor)}>
                    {proveedor.activo ? 'Desactivar' : 'Reactivar'}
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
