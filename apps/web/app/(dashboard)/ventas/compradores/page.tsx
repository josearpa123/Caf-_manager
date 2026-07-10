'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Comprador } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
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

export default function CompradoresPage() {
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    api
      .get<Comprador[]>('/compradores')
      .then(setCompradores)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar compradores'),
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
      await api.post('/compradores', {
        nombre,
        identificacion: identificacion || undefined,
        telefono: telefono || undefined,
      });
      setNombre('');
      setIdentificacion('');
      setTelefono('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el comprador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActivo = async (comprador: Comprador) => {
    setUpdatingId(comprador.id);
    setError(null);
    try {
      await api.patch(`/compradores/${comprador.id}`, { activo: !comprador.activo });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Compradores</h1>

      <form
        onSubmit={onSubmit}
        className="mt-6 flex max-w-2xl flex-wrap items-end gap-3 rounded-md border p-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-48" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="identificacion">Identificación</Label>
          <Input
            id="identificacion"
            value={identificacion}
            onChange={(e) => setIdentificacion(e.target.value)}
            className="w-40"
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Table className="mt-6 max-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Identificación</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={5}>Cargando…</TableEmpty>}
          {!isLoading && compradores.length === 0 && (
            <TableEmpty colSpan={5}>No hay compradores todavía.</TableEmpty>
          )}
          {compradores.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.nombre}</TableCell>
              <TableCell className="text-muted-foreground">{c.identificacion ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{c.telefono ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={c.activo ? 'success' : 'neutral'} dot>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updatingId === c.id}
                  onClick={() => toggleActivo(c)}
                >
                  {c.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
