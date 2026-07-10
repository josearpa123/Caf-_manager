'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Proveedor } from '@coffee-manager/shared-types';
import { Search } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o identificación…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
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

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Identificación</TableHead>
            <TableHead>Municipio</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={6}>Cargando…</TableEmpty>}
          {!isLoading && proveedores.length === 0 && (
            <TableEmpty colSpan={6}>No hay proveedores registrados.</TableEmpty>
          )}
          {proveedores.map((proveedor) => (
            <TableRow key={proveedor.id}>
              <TableCell>
                <Link
                  href={`/proveedores/${proveedor.id}`}
                  className="font-medium hover:underline"
                >
                  {proveedor.nombre}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {proveedor.tipoIdentificacion} {proveedor.numeroIdentificacion}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {proveedor.municipio ?? '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {proveedor.telefono ?? '—'}
              </TableCell>
              <TableCell>
                <Badge variant={proveedor.activo ? 'success' : 'neutral'} dot>
                  {proveedor.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => toggleActivo(proveedor)}>
                  {proveedor.activo ? 'Desactivar' : 'Reactivar'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
