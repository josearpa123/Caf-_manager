'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Proveedor, PuntoCompra } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default function NuevoPrestamoPage() {
  const router = useRouter();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);

  const [proveedorId, setProveedorId] = useState('');
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<Proveedor[]>('/proveedores?activo=true').then(setProveedores).catch(() => {});
    api.get<PuntoCompra[]>('/puntos-compra').then(setPuntosCompra).catch(() => {});
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!proveedorId || !puntoCompraId || !monto) {
      setError('Completa proveedor, punto de compra y monto');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/prestamos', {
        proveedorId,
        puntoCompraId,
        monto: Number(monto),
        notas: notas || undefined,
      });
      router.push('/prestamos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el préstamo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Nuevo préstamo"
        description="Se registra el capital prestado al proveedor. Los abonos de devolución se agregan después desde el detalle del préstamo."
      />

      <form onSubmit={onSubmit} className="mt-6 flex max-w-xl flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proveedorId">Proveedor</Label>
            <Select
              id="proveedorId"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              required
            >
              <option value="">Selecciona…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
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
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="monto">Monto prestado</Label>
          <Input
            id="monto"
            type="number"
            step="1"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="max-w-[240px]"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Registrar préstamo'}
          </Button>
        </div>
      </form>
    </div>
  );
}
