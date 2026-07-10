'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Comprador, PuntoCompra } from '@coffee-manager/shared-types';
import { TipoInventario } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default function NuevoContratoVentaPage() {
  const router = useRouter();

  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);

  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [tipoCafe, setTipoCafe] = useState<string>(TipoInventario.PERGAMINO);
  const [compradorId, setCompradorId] = useState('');
  const [compradorNombre, setCompradorNombre] = useState('');
  const [cantidadKgPactada, setCantidadKgPactada] = useState('');
  const [precioKg, setPrecioKg] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<PuntoCompra[]>('/puntos-compra').then(setPuntosCompra).catch(() => {});
    api.get<Comprador[]>('/compradores').then(setCompradores).catch(() => {});
  }, []);

  const onSeleccionarComprador = (id: string) => {
    setCompradorId(id);
    const comprador = compradores.find((c) => c.id === id);
    if (comprador) setCompradorNombre(comprador.nombre);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!puntoCompraId || !compradorNombre || !cantidadKgPactada || !precioKg) {
      setError('Completa punto de compra, comprador, cantidad y precio');
      return;
    }

    setIsSubmitting(true);
    try {
      const contrato = await api.post<{ id: string }>('/contratos-venta', {
        puntoCompraId,
        tipoCafe,
        compradorId: compradorId || undefined,
        compradorNombre,
        cantidadKgPactada: Number(cantidadKgPactada),
        precioKg: Number(precioKg),
        fechaLimite: fechaLimite || undefined,
        observaciones: observaciones || undefined,
      });
      router.push(`/ventas/contratos/${contrato.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el contrato');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Nuevo contrato de venta anticipada</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Fija hoy el precio y la cantidad con una trilladora/comprador. Después, cada entrega se
        registra desde &quot;Nueva venta&quot; seleccionando este contrato — el precio queda
        bloqueado, tú solo indicas cuánto entregas cada vez.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex max-w-xl flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipoCafe">Tipo de café</Label>
            <Select id="tipoCafe" value={tipoCafe} onChange={(e) => setTipoCafe(e.target.value)}>
              {Object.values(TipoInventario).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compradorId">Comprador guardado (opcional)</Label>
            <Select
              id="compradorId"
              value={compradorId}
              onChange={(e) => onSeleccionarComprador(e.target.value)}
            >
              <option value="">Ninguno — escribir nombre libre</option>
              {compradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compradorNombre">Nombre del comprador</Label>
            <Input
              id="compradorNombre"
              value={compradorNombre}
              onChange={(e) => setCompradorNombre(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cantidadKgPactada">Cantidad pactada (kg)</Label>
            <Input
              id="cantidadKgPactada"
              type="number"
              step="0.01"
              value={cantidadKgPactada}
              onChange={(e) => setCantidadKgPactada(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="precioKg">Precio fijo por kg</Label>
            <Input
              id="precioKg"
              type="number"
              step="1"
              value={precioKg}
              onChange={(e) => setPrecioKg(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fechaLimite">Fecha límite (opcional)</Label>
            <Input
              id="fechaLimite"
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="observaciones">Observaciones (opcional)</Label>
          <Input
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Crear contrato'}
          </Button>
        </div>
      </form>
    </div>
  );
}
