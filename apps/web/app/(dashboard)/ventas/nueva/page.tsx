'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  Comprador,
  ContratoVenta,
  InventarioItem,
  PuntoCompra,
  Recepcion,
} from '@coffee-manager/shared-types';
import { TipoInventario } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface LoteEntry {
  recepcionId: string;
  codigo: string;
  cantidadKgAtribuida: string;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function NuevaVentaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [contratos, setContratos] = useState<ContratoVenta[]>([]);

  const [contratoVentaId, setContratoVentaId] = useState('');
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [tipoCafe, setTipoCafe] = useState<string>(TipoInventario.PERGAMINO);
  const [compradorId, setCompradorId] = useState('');
  const [compradorNombre, setCompradorNombre] = useState('');
  const [cantidadKg, setCantidadKg] = useState('');
  const [precioKg, setPrecioKg] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [lotes, setLotes] = useState<LoteEntry[]>([]);
  const [nuevoLoteRecepcionId, setNuevoLoteRecepcionId] = useState('');
  const [nuevoLoteCantidad, setNuevoLoteCantidad] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<PuntoCompra[]>('/puntos-compra').then(setPuntosCompra).catch(() => {});
    api.get<Comprador[]>('/compradores').then(setCompradores).catch(() => {});
    api.get<InventarioItem[]>('/bodega/inventario').then(setInventario).catch(() => {});
    api
      .get<ContratoVenta[]>('/contratos-venta?estado=VIGENTE')
      .then(setContratos)
      .catch(() => {});
  }, []);

  // Si se llega desde el detalle de un contrato ("Registrar entrega"), lo
  // preselecciona apenas la lista de contratos vigentes esté cargada.
  useEffect(() => {
    const desdeUrl = searchParams.get('contratoVentaId');
    if (desdeUrl && contratos.some((c) => c.id === desdeUrl)) {
      setContratoVentaId(desdeUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratos]);

  const contrato = contratos.find((c) => c.id === contratoVentaId) ?? null;

  useEffect(() => {
    if (contrato) {
      setTipoCafe(contrato.tipoCafe);
      setCompradorId(contrato.compradorId ?? '');
      setCompradorNombre(contrato.compradorNombre);
      setPrecioKg(contrato.precioKg);
      if (!puntoCompraId) setPuntoCompraId(contrato.puntoCompraId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrato]);

  useEffect(() => {
    setLotes([]);
    if (!puntoCompraId) {
      setRecepciones([]);
      return;
    }
    api
      .get<Recepcion[]>(`/recepcion?puntoCompraId=${puntoCompraId}`)
      .then(setRecepciones)
      .catch(() => setRecepciones([]));
  }, [puntoCompraId]);

  const stockDisponible = inventario.find(
    (i) => i.puntoCompraId === puntoCompraId && i.tipoCafe === tipoCafe,
  )?.cantidadKg;

  const valorTotal =
    cantidadKg && precioKg ? Number(cantidadKg) * Number(precioKg) : null;

  const sumaLotes = lotes.reduce((acc, l) => acc + (Number(l.cantidadKgAtribuida) || 0), 0);

  const onSeleccionarComprador = (id: string) => {
    setCompradorId(id);
    const comprador = compradores.find((c) => c.id === id);
    if (comprador) setCompradorNombre(comprador.nombre);
  };

  const agregarLote = () => {
    if (!nuevoLoteRecepcionId || !nuevoLoteCantidad) return;
    const recepcion = recepciones.find((r) => r.id === nuevoLoteRecepcionId);
    if (!recepcion) return;
    setLotes((prev) => [
      ...prev,
      {
        recepcionId: nuevoLoteRecepcionId,
        codigo: recepcion.codigo,
        cantidadKgAtribuida: nuevoLoteCantidad,
      },
    ]);
    setNuevoLoteRecepcionId('');
    setNuevoLoteCantidad('');
  };

  const quitarLote = (index: number) => {
    setLotes((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!puntoCompraId || !compradorNombre || !cantidadKg || !precioKg) {
      setError('Completa punto de compra, comprador, cantidad y precio');
      return;
    }
    if (lotes.length === 0) {
      setError('Agrega al menos un lote de origen');
      return;
    }
    if (contrato && Number(cantidadKg) > contrato.saldoPendienteKg) {
      setError(
        `La cantidad excede el saldo pendiente del contrato (${contrato.saldoPendienteKg.toFixed(2)} kg)`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const venta = await api.post<{ id: string }>('/ventas', {
        puntoCompraId,
        contratoVentaId: contratoVentaId || undefined,
        tipoCafe: contrato ? undefined : tipoCafe,
        compradorId: compradorId || undefined,
        compradorNombre: contrato ? undefined : compradorNombre,
        cantidadKg: Number(cantidadKg),
        precioKg: contrato ? undefined : Number(precioKg),
        observaciones: observaciones || undefined,
        lotesOrigen: lotes.map((l) => ({
          recepcionId: l.recepcionId,
          cantidadKgAtribuida: Number(l.cantidadKgAtribuida),
        })),
      });
      router.push(`/ventas/${venta.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Nueva venta</h1>

      <form onSubmit={onSubmit} className="mt-6 flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-1.5 rounded-md border p-4">
          <Label htmlFor="contratoVentaId">Contrato de venta anticipada (opcional)</Label>
          <Select
            id="contratoVentaId"
            value={contratoVentaId}
            onChange={(e) => setContratoVentaId(e.target.value)}
          >
            <option value="">Ninguno — venta libre</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.compradorNombre} — {c.tipoCafe} — saldo{' '}
                {c.saldoPendienteKg.toFixed(2)} kg
              </option>
            ))}
          </Select>
          {contrato && (
            <p className="mt-1 text-xs text-muted-foreground">
              Precio bloqueado en {formatMoney(Number(contrato.precioKg))}/kg. Saldo disponible
              para entregar: {contrato.saldoPendienteKg.toFixed(2)} kg.
            </p>
          )}
        </div>

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
            <Select
              id="tipoCafe"
              value={tipoCafe}
              onChange={(e) => setTipoCafe(e.target.value)}
              disabled={!!contrato}
            >
              {Object.values(TipoInventario).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            {stockDisponible !== undefined && (
              <p className="text-xs text-muted-foreground">
                Disponible: {stockDisponible.toFixed(2)} kg
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compradorId">Comprador guardado (opcional)</Label>
            <Select
              id="compradorId"
              value={compradorId}
              onChange={(e) => onSeleccionarComprador(e.target.value)}
              disabled={!!contrato}
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
              disabled={!!contrato}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cantidadKg">Cantidad (kg)</Label>
            <Input
              id="cantidadKg"
              type="number"
              step="0.01"
              max={contrato ? contrato.saldoPendienteKg : undefined}
              value={cantidadKg}
              onChange={(e) => setCantidadKg(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="precioKg">Precio por kg</Label>
            <Input
              id="precioKg"
              type="number"
              step="1"
              value={precioKg}
              onChange={(e) => setPrecioKg(e.target.value)}
              disabled={!!contrato}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Valor total</Label>
            <p className="flex h-9 items-center text-sm font-medium">
              {valorTotal !== null ? valorTotal.toLocaleString('es-CO') : '—'}
            </p>
          </div>
        </div>

        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Lotes de origen (trazabilidad)</p>
            <p className="text-xs text-muted-foreground">
              Suma actual: {sumaLotes.toFixed(2)} kg
              {cantidadKg ? ` / ${Number(cantidadKg).toFixed(2)} kg` : ''}
            </p>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <Select
              value={nuevoLoteRecepcionId}
              onChange={(e) => setNuevoLoteRecepcionId(e.target.value)}
              disabled={!puntoCompraId}
              className="max-w-xs"
            >
              <option value="">Recepción…</option>
              {recepciones.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.codigo}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              step="0.01"
              placeholder="kg"
              value={nuevoLoteCantidad}
              onChange={(e) => setNuevoLoteCantidad(e.target.value)}
              className="max-w-[120px]"
            />
            <Button type="button" variant="outline" size="sm" onClick={agregarLote}>
              Agregar
            </Button>
          </div>
          {lotes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {lotes.map((l, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span>
                    {l.codigo} — {Number(l.cantidadKgAtribuida)} kg
                  </span>
                  <button
                    type="button"
                    onClick={() => quitarLote(i)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
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
            {isSubmitting ? 'Guardando…' : 'Registrar venta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
