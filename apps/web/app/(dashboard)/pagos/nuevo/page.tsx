'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Proveedor, PuntoCompra, Recepcion } from '@coffee-manager/shared-types';
import { MetodoPago } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
  CREDITO: 'Crédito (queda como deuda pendiente)',
};

export default function NuevoPagoPage() {
  const router = useRouter();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);

  const [proveedorId, setProveedorId] = useState('');
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [recepcionId, setRecepcionId] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<string>(MetodoPago.EFECTIVO);
  const [referencia, setReferencia] = useState('');
  const [numeroCheque, setNumeroCheque] = useState('');
  const [notas, setNotas] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<Proveedor[]>('/proveedores?activo=true').then(setProveedores).catch(() => {});
    api.get<PuntoCompra[]>('/puntos-compra').then(setPuntosCompra).catch(() => {});
  }, []);

  useEffect(() => {
    setRecepcionId('');
    if (!proveedorId) {
      setRecepciones([]);
      return;
    }
    api
      .get<Recepcion[]>(`/recepcion?proveedorId=${proveedorId}`)
      .then(setRecepciones)
      .catch(() => setRecepciones([]));
  }, [proveedorId]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!proveedorId || !puntoCompraId || !monto) {
      setError('Completa proveedor, punto de compra y monto');
      return;
    }
    if (metodoPago === MetodoPago.CHEQUE && !numeroCheque) {
      setError('Ingresa el número de cheque');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/pagos', {
        proveedorId,
        puntoCompraId,
        recepcionId: recepcionId || undefined,
        monto: Number(monto),
        metodoPago,
        referencia: referencia || undefined,
        numeroCheque: metodoPago === MetodoPago.CHEQUE ? numeroCheque : undefined,
        notas: notas || undefined,
      });
      router.push('/pagos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Nuevo pago</h1>

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
          <Label htmlFor="recepcionId">Recepción (opcional)</Label>
          <Select
            id="recepcionId"
            value={recepcionId}
            onChange={(e) => setRecepcionId(e.target.value)}
            disabled={!proveedorId}
          >
            <option value="">Ninguna — pago general al proveedor</option>
            {recepciones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.codigo} — {Number(r.valorTotal).toLocaleString('es-CO')} COP
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monto">Monto</Label>
            <Input
              id="monto"
              type="number"
              step="1"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="metodoPago">Método de pago</Label>
            <Select
              id="metodoPago"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              {Object.values(MetodoPago).map((m) => (
                <option key={m} value={m}>
                  {METODO_LABEL[m]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {metodoPago === MetodoPago.CHEQUE && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="numeroCheque">Número de cheque</Label>
            <Input
              id="numeroCheque"
              value={numeroCheque}
              onChange={(e) => setNumeroCheque(e.target.value)}
              className="max-w-[200px]"
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="referencia">Referencia (opcional)</Label>
          <Input
            id="referencia"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Registrar pago'}
          </Button>
        </div>
      </form>
    </div>
  );
}
