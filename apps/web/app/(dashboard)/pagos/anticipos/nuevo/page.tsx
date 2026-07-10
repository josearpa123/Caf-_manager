'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Proveedor, PuntoCompra } from '@coffee-manager/shared-types';
import { MetodoPago } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const METODOS_ANTICIPO = [MetodoPago.EFECTIVO, MetodoPago.TRANSFERENCIA, MetodoPago.CHEQUE];

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
};

export default function NuevoAnticipoPage() {
  const router = useRouter();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);

  const [proveedorId, setProveedorId] = useState('');
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<string>(MetodoPago.EFECTIVO);
  const [referencia, setReferencia] = useState('');
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
      await api.post('/anticipos', {
        proveedorId,
        puntoCompraId,
        monto: Number(monto),
        metodoPago,
        referencia: referencia || undefined,
        notas: notas || undefined,
      });
      router.push('/pagos/anticipos');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el anticipo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Nuevo anticipo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Se registra como una transacción independiente. Más adelante se puede conciliar contra
        una recepción o un pago desde el detalle del anticipo.
      </p>

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
              {METODOS_ANTICIPO.map((m) => (
                <option key={m} value={m}>
                  {METODO_LABEL[m]}
                </option>
              ))}
            </Select>
          </div>
        </div>

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
            {isSubmitting ? 'Guardando…' : 'Registrar anticipo'}
          </Button>
        </div>
      </form>
    </div>
  );
}
