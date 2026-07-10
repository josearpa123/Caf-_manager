'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { PuntoCompra } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <PageHeader title="Puntos de compra" />

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

      <Table className="mt-6 max-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead>Municipio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={5}>Cargando…</TableEmpty>}
          {!isLoading && puntos.length === 0 && (
            <TableEmpty colSpan={5}>No hay puntos de compra todavía.</TableEmpty>
          )}
          {puntos.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.nombre}</TableCell>
              <TableCell className="text-muted-foreground">{p.direccion ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{p.municipio ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={p.activo ? 'success' : 'neutral'} dot>
                  {p.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updatingId === p.id}
                  onClick={() => toggleActivo(p)}
                >
                  {p.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
