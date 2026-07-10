'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { PuntoCompra, Recepcion } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default function NuevoSecadoPage() {
  const router = useRouter();
  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<PuntoCompra[]>('/puntos-compra').then(setPuntosCompra).catch(() => {});
  }, []);

  useEffect(() => {
    if (!puntoCompraId) {
      setRecepciones([]);
      return;
    }
    api
      .get<Recepcion[]>(`/recepcion?tipoCafe=MOJADO&puntoCompraId=${puntoCompraId}`)
      .then(setRecepciones)
      .catch(() => {});
    setSeleccionadas(new Set());
  }, [puntoCompraId]);

  const toggle = (id: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pesoSeleccionado = recepciones
    .filter((r) => seleccionadas.has(r.id))
    .reduce((acc, r) => acc + Number(r.pesoNeto), 0);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!puntoCompraId || seleccionadas.size === 0) {
      setError('Selecciona el punto de compra y al menos una recepción');
      return;
    }
    setIsSubmitting(true);
    try {
      const proceso = await api.post<{ id: string }>('/bodega/secado', {
        puntoCompraId,
        recepcionIds: Array.from(seleccionadas),
        observaciones: observaciones || undefined,
      });
      router.push(`/bodega/secado/${proceso.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el proceso de secado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Nuevo proceso de secado</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Selecciona las recepciones de café mojado que entran a secar. Cada recepción se consume
        por completo.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex max-w-xl flex-col gap-4">
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

        {puntoCompraId && (
          <div>
            <Label>Recepciones de mojado disponibles</Label>
            <div className="mt-2 max-h-72 overflow-y-auto rounded-md border">
              {recepciones.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  No hay recepciones de mojado en este punto de compra.
                </p>
              )}
              {recepciones.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center justify-between border-b px-3 py-2 text-sm last:border-b-0 hover:bg-secondary/40"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={seleccionadas.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                    {r.codigo} — {r.proveedor.nombre}
                  </span>
                  <span className="text-muted-foreground">{Number(r.pesoNeto)} kg</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Total seleccionado: <span className="font-medium">{pesoSeleccionado.toFixed(2)} kg</span>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Input
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Iniciar secado'}
          </Button>
        </div>
      </form>
    </div>
  );
}
