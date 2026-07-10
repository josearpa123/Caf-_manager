'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Comprador, PuntoCompra } from '@coffee-manager/shared-types';
import { TipoInventario } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Kilogramos es la unidad base en todo el sistema (ver requerimientos.md).
// La arroba es solo un formato de entrada/visualización en este formulario;
// lo que se manda a la API siempre queda convertido a kg.
const ARROBA_KG = 12.5;

type Unidad = 'kg' | '@';

function UnitToggle({ unidad, onChange }: { unidad: Unidad; onChange: (u: Unidad) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border text-xs">
      {(['kg', '@'] as const).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={cn(
            'px-2 py-1 font-medium transition-colors',
            unidad === u
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-accent',
          )}
        >
          {u === 'kg' ? 'kg' : '@ (arroba)'}
        </button>
      ))}
    </div>
  );
}

export default function NuevoContratoVentaPage() {
  const router = useRouter();

  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);

  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [tipoCafe, setTipoCafe] = useState<string>(TipoInventario.PERGAMINO);
  const [compradorId, setCompradorId] = useState('');
  const [compradorNombre, setCompradorNombre] = useState('');

  const [unidadCantidad, setUnidadCantidad] = useState<Unidad>('kg');
  const [cantidad, setCantidad] = useState('');
  const [unidadPrecio, setUnidadPrecio] = useState<Unidad>('kg');
  const [precio, setPrecio] = useState('');

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

  // Al cambiar de unidad, convierte el número ya escrito para no perder el
  // valor real (ej. 100 kg -> 8 @ en vez de quedar en "100 @").
  const cambiarUnidadCantidad = (nueva: Unidad) => {
    if (cantidad && !Number.isNaN(Number(cantidad))) {
      const kg = unidadCantidad === '@' ? Number(cantidad) * ARROBA_KG : Number(cantidad);
      setCantidad(nueva === '@' ? String(kg / ARROBA_KG) : String(kg));
    }
    setUnidadCantidad(nueva);
  };

  const cambiarUnidadPrecio = (nueva: Unidad) => {
    if (precio && !Number.isNaN(Number(precio))) {
      const porKg = unidadPrecio === '@' ? Number(precio) / ARROBA_KG : Number(precio);
      setPrecio(nueva === '@' ? String(porKg * ARROBA_KG) : String(porKg));
    }
    setUnidadPrecio(nueva);
  };

  const cantidadKg =
    cantidad && !Number.isNaN(Number(cantidad))
      ? unidadCantidad === '@'
        ? Number(cantidad) * ARROBA_KG
        : Number(cantidad)
      : null;

  const precioKg =
    precio && !Number.isNaN(Number(precio))
      ? unidadPrecio === '@'
        ? Number(precio) / ARROBA_KG
        : Number(precio)
      : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!puntoCompraId || !compradorNombre || cantidadKg === null || precioKg === null) {
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
        cantidadKgPactada: Math.round(cantidadKg * 100) / 100,
        precioKg: Math.round(precioKg * 100) / 100,
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
      <PageHeader
        title="Nuevo contrato de venta anticipada"
        description={
          'Fija hoy el precio y la cantidad con una trilladora/comprador. Después, cada entrega se registra desde "Nueva venta" seleccionando este contrato — el precio queda bloqueado, tú solo indicas cuánto entregas cada vez.'
        }
      />

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

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="cantidad">Cantidad pactada</Label>
              <UnitToggle unidad={unidadCantidad} onChange={cambiarUnidadCantidad} />
            </div>
            <Input
              id="cantidad"
              type="number"
              step="0.01"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
            {cantidadKg !== null && (
              <p className="text-xs text-muted-foreground">
                {unidadCantidad === '@'
                  ? `= ${cantidadKg.toFixed(2)} kg`
                  : `= ${(cantidadKg / ARROBA_KG).toFixed(2)} @ (arroba de ${ARROBA_KG} kg)`}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="precio">Precio fijo</Label>
              <UnitToggle unidad={unidadPrecio} onChange={cambiarUnidadPrecio} />
            </div>
            <Input
              id="precio"
              type="number"
              step="1"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
            />
            {precioKg !== null && (
              <p className="text-xs text-muted-foreground">
                {unidadPrecio === '@'
                  ? `= ${precioKg.toLocaleString('es-CO', { maximumFractionDigits: 0 })}/kg`
                  : `= ${(precioKg * ARROBA_KG).toLocaleString('es-CO', { maximumFractionDigits: 0 })}/@`}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fechaLimite">Fecha límite (opcional)</Label>
          <Input
            id="fechaLimite"
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="max-w-[200px]"
          />
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
