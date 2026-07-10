'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { DefectoTipo, Proveedor, PuntoCompra } from '@coffee-manager/shared-types';
import { TipoCafeRecepcion, ModoFactorRendimiento } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface DefectoEntry {
  defectoTipoId: string;
  porcentaje: string;
}

export default function NuevaRecepcionPage() {
  const router = useRouter();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [defectosTipo, setDefectosTipo] = useState<DefectoTipo[]>([]);

  const [tipoCafe, setTipoCafe] = useState<'MOJADO' | 'PERGAMINO' | 'PASILLA'>(
    TipoCafeRecepcion.MOJADO,
  );
  const [proveedorId, setProveedorId] = useState('');
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoTara, setPesoTara] = useState('');

  const [humedad, setHumedad] = useState('');
  const [modoFactor, setModoFactor] = useState<'CALCULADO' | 'MANUAL'>(
    ModoFactorRendimiento.CALCULADO,
  );
  const [pesoMuestraKg, setPesoMuestraKg] = useState('');
  const [pesoAlmendraMuestraKg, setPesoAlmendraMuestraKg] = useState('');
  const [factorRendimiento, setFactorRendimiento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [defectos, setDefectos] = useState<DefectoEntry[]>([]);
  const [nuevoDefectoId, setNuevoDefectoId] = useState('');
  const [nuevoDefectoPct, setNuevoDefectoPct] = useState('');

  const [precioKg, setPrecioKg] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get<Proveedor[]>('/proveedores?activo=true').then(setProveedores).catch(() => {});
    api.get<PuntoCompra[]>('/puntos-compra').then(setPuntosCompra).catch(() => {});
    api.get<DefectoTipo[]>('/calidad/defectos-tipo').then(setDefectosTipo).catch(() => {});
  }, []);

  const pesoNeto =
    pesoBruto && pesoTara ? Math.max(0, Number(pesoBruto) - Number(pesoTara)) : null;

  const factorCalculado =
    modoFactor === 'CALCULADO' && pesoMuestraKg && pesoAlmendraMuestraKg
      ? ((Number(pesoAlmendraMuestraKg) / Number(pesoMuestraKg)) * 100).toFixed(2)
      : null;

  const agregarDefecto = () => {
    if (!nuevoDefectoId) return;
    setDefectos((prev) => [...prev, { defectoTipoId: nuevoDefectoId, porcentaje: nuevoDefectoPct }]);
    setNuevoDefectoId('');
    setNuevoDefectoPct('');
  };

  const quitarDefecto = (index: number) => {
    setDefectos((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!proveedorId || !puntoCompraId || !pesoBruto || !pesoTara) {
      setError('Completa proveedor, punto de compra y pesos');
      return;
    }

    const payload: Record<string, unknown> = {
      proveedorId,
      puntoCompraId,
      tipoCafe,
      pesoBruto: Number(pesoBruto),
      pesoTara: Number(pesoTara),
    };

    if (tipoCafe === TipoCafeRecepcion.PERGAMINO) {
      if (!humedad) {
        setError('Ingresa la humedad');
        return;
      }
      const analisisCalidad: Record<string, unknown> = {
        humedad: Number(humedad),
        modoFactor,
        observaciones: observaciones || undefined,
      };
      if (modoFactor === 'CALCULADO') {
        if (!pesoMuestraKg || !pesoAlmendraMuestraKg) {
          setError('Para factor calculado ingresa el peso de la muestra y el peso de almendra');
          return;
        }
        analisisCalidad.pesoMuestraKg = Number(pesoMuestraKg);
        analisisCalidad.pesoAlmendraMuestraKg = Number(pesoAlmendraMuestraKg);
      } else {
        if (!factorRendimiento) {
          setError('Ingresa el factor de rendimiento');
          return;
        }
        analisisCalidad.factorRendimiento = Number(factorRendimiento);
      }
      if (defectos.length > 0) {
        analisisCalidad.defectos = defectos.map((d) => ({
          defectoTipoId: d.defectoTipoId,
          porcentaje: d.porcentaje ? Number(d.porcentaje) : undefined,
        }));
      }
      payload.analisisCalidad = analisisCalidad;
    } else {
      if (!precioKg) {
        setError('Ingresa el precio por kg negociado');
        return;
      }
      payload.precioKg = Number(precioKg);
    }

    setIsSubmitting(true);
    try {
      const recepcion = await api.post<{ id: string }>('/recepcion', payload);
      router.push(`/recepcion/${recepcion.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la recepción');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader title="Nueva recepción" />

      <form onSubmit={onSubmit} className="mt-6 flex max-w-2xl flex-col gap-6">
        <div className="flex gap-2">
          {(Object.values(TipoCafeRecepcion) as Array<'MOJADO' | 'PERGAMINO' | 'PASILLA'>).map(
            (tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoCafe(tipo)}
                className={`rounded-md border px-4 py-2 text-sm font-medium ${
                  tipoCafe === tipo
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background'
                }`}
              >
                {tipo === 'MOJADO' ? 'Mojado' : tipo === 'PERGAMINO' ? 'Pergamino seco' : 'Pasilla'}
              </button>
            ),
          )}
        </div>

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

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pesoBruto">Peso bruto (kg)</Label>
            <Input
              id="pesoBruto"
              type="number"
              step="0.01"
              value={pesoBruto}
              onChange={(e) => setPesoBruto(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pesoTara">Tara (kg)</Label>
            <Input
              id="pesoTara"
              type="number"
              step="0.01"
              value={pesoTara}
              onChange={(e) => setPesoTara(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Peso neto</Label>
            <p className="flex h-9 items-center text-sm font-medium">
              {pesoNeto !== null ? `${pesoNeto.toFixed(2)} kg` : '—'}
            </p>
          </div>
        </div>

        {tipoCafe === 'PERGAMINO' && (
          <div className="flex flex-col gap-4 rounded-md border p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="humedad">Humedad (%)</Label>
              <Input
                id="humedad"
                type="number"
                step="0.01"
                value={humedad}
                onChange={(e) => setHumedad(e.target.value)}
                className="max-w-[160px]"
                required
              />
            </div>

            <div className="flex gap-2">
              {(['CALCULADO', 'MANUAL'] as const).map((modo) => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => setModoFactor(modo)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    modoFactor === modo
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background'
                  }`}
                >
                  Factor {modo === 'CALCULADO' ? 'calculado' : 'manual'}
                </button>
              ))}
            </div>

            {modoFactor === 'CALCULADO' ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pesoMuestraKg">Peso muestra (kg)</Label>
                  <Input
                    id="pesoMuestraKg"
                    type="number"
                    step="0.0001"
                    value={pesoMuestraKg}
                    onChange={(e) => setPesoMuestraKg(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pesoAlmendraMuestraKg">Peso almendra muestra (kg)</Label>
                  <Input
                    id="pesoAlmendraMuestraKg"
                    type="number"
                    step="0.0001"
                    value={pesoAlmendraMuestraKg}
                    onChange={(e) => setPesoAlmendraMuestraKg(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Factor resultante</Label>
                  <p className="flex h-9 items-center text-sm font-medium">
                    {factorCalculado ?? '—'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="factorRendimiento">Factor de rendimiento</Label>
                <Input
                  id="factorRendimiento"
                  type="number"
                  step="0.01"
                  value={factorRendimiento}
                  onChange={(e) => setFactorRendimiento(e.target.value)}
                  className="max-w-[160px]"
                />
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

            <div>
              <Label>Defectos</Label>
              <div className="mt-2 flex items-end gap-2">
                <Select
                  value={nuevoDefectoId}
                  onChange={(e) => setNuevoDefectoId(e.target.value)}
                  className="max-w-xs"
                >
                  <option value="">Tipo de defecto…</option>
                  {defectosTipo.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="%"
                  value={nuevoDefectoPct}
                  onChange={(e) => setNuevoDefectoPct(e.target.value)}
                  className="max-w-[100px]"
                />
                <Button type="button" variant="outline" size="sm" onClick={agregarDefecto}>
                  Agregar
                </Button>
              </div>
              {defectos.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  {defectos.map((d, i) => {
                    const tipo = defectosTipo.find((t) => t.id === d.defectoTipoId);
                    return (
                      <li key={i} className="flex items-center justify-between">
                        <span>
                          {tipo?.nombre ?? d.defectoTipoId}
                          {d.porcentaje ? ` — ${d.porcentaje}%` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => quitarDefecto(i)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Quitar
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {tipoCafe !== 'PERGAMINO' && (
          <div className="flex flex-col gap-1.5 rounded-md border p-4">
            <Label htmlFor="precioKg">Precio por kg (negociado directamente)</Label>
            <Input
              id="precioKg"
              type="number"
              step="1"
              value={precioKg}
              onChange={(e) => setPrecioKg(e.target.value)}
              className="max-w-[200px]"
              required
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Registrar recepción'}
          </Button>
        </div>
      </form>
    </div>
  );
}
