'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Factura, Recepcion } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [recepcionId, setRecepcionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.get<Recepcion[]>('/recepcion'), api.get<Factura[]>('/facturacion')])
      .then(([recs, facturas]) => {
        const conFactura = new Set(facturas.map((f) => f.recepcionId));
        setRecepciones(recs.filter((r) => !conFactura.has(r.id)));
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!recepcionId) {
      setError('Selecciona una recepción');
      return;
    }
    setIsSubmitting(true);
    try {
      const factura = await api.post<{ id: string }>('/facturacion', { recepcionId });
      router.push(`/facturacion/${factura.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo generar la factura');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Generar factura</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Se crea el registro de la factura (1 por recepción). La emisión real ante la DIAN se hace
        después, desde el detalle, y hoy fallará con un mensaje claro porque no hay proveedor
        tecnológico conectado.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recepcionId">Recepción</Label>
          <Select
            id="recepcionId"
            value={recepcionId}
            onChange={(e) => setRecepcionId(e.target.value)}
            required
          >
            <option value="">Selecciona…</option>
            {recepciones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.codigo} — {r.proveedor.nombre}
              </option>
            ))}
          </Select>
          {recepciones.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay recepciones sin factura todavía.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Generando…' : 'Generar factura'}
          </Button>
        </div>
      </form>
    </div>
  );
}
