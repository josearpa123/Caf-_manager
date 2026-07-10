'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import type { AnticipoDetalle, Pago, Recepcion } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function AnticipoDetallePage() {
  const params = useParams<{ id: string }>();
  const [anticipo, setAnticipo] = useState<AnticipoDetalle | null>(null);
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [destino, setDestino] = useState<'recepcion' | 'pago'>('recepcion');
  const [recepcionId, setRecepcionId] = useState('');
  const [pagoId, setPagoId] = useState('');
  const [montoAplicado, setMontoAplicado] = useState('');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    api
      .get<AnticipoDetalle>(`/anticipos/${params.id}`)
      .then((a) => {
        setAnticipo(a);
        return Promise.all([
          api.get<Recepcion[]>(`/recepcion?proveedorId=${a.proveedorId}`),
          api.get<Pago[]>(`/pagos?proveedorId=${a.proveedorId}`),
        ]);
      })
      .then(([recs, pgs]) => {
        setRecepciones(recs);
        setPagos(pgs);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el anticipo'),
      );
  };

  useEffect(load, [params.id]);

  const onConciliar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!anticipo) return;
    if (!montoAplicado || (destino === 'recepcion' ? !recepcionId : !pagoId)) {
      setError('Selecciona el destino y el monto a aplicar');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/conciliaciones', {
        proveedorId: anticipo.proveedorId,
        anticipoId: anticipo.id,
        recepcionId: destino === 'recepcion' ? recepcionId : undefined,
        pagoId: destino === 'pago' ? pagoId : undefined,
        montoAplicado: Number(montoAplicado),
        notas: notas || undefined,
      });
      setRecepcionId('');
      setPagoId('');
      setMontoAplicado('');
      setNotas('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conciliar el anticipo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && !anticipo) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!anticipo) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="p-8">
      <PageHeader
        title={`Anticipo — ${anticipo.proveedor.nombre}`}
        description={`${new Date(anticipo.fecha).toLocaleString('es-CO')} · ${anticipo.puntoCompra.nombre}`}
      />

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Monto</p>
            <p className="text-sm font-medium">{formatMoney(anticipo.monto)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conciliado</p>
            <p className="text-sm font-medium">{formatMoney(anticipo.montoConciliado)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo disponible</p>
            <p className="text-sm font-medium">{formatMoney(anticipo.saldoDisponible)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Conciliaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {anticipo.conciliaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin conciliaciones todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {anticipo.conciliaciones.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>
                    {c.recepcion ? `Recepción ${c.recepcion.codigo}` : `Pago ${c.pago?.id.slice(-6)}`}
                    {c.notas ? ` — ${c.notas}` : ''}
                  </span>
                  <span className="font-medium">{formatMoney(c.montoAplicado)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {anticipo.saldoDisponible > 0 && (
        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle>Conciliar</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onConciliar} className="flex flex-col gap-4">
              <div className="flex gap-2">
                {(['recepcion', 'pago'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDestino(d)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                      destino === d
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background'
                    }`}
                  >
                    Contra {d === 'recepcion' ? 'recepción' : 'pago'}
                  </button>
                ))}
              </div>

              {destino === 'recepcion' ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recepcionId">Recepción</Label>
                  <Select
                    id="recepcionId"
                    value={recepcionId}
                    onChange={(e) => setRecepcionId(e.target.value)}
                  >
                    <option value="">Selecciona…</option>
                    {recepciones.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.codigo} — {formatMoney(r.valorTotal)}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pagoId">Pago</Label>
                  <Select id="pagoId" value={pagoId} onChange={(e) => setPagoId(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {pagos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {new Date(p.fecha).toLocaleDateString('es-CO')} — {formatMoney(p.monto)}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="montoAplicado">Monto a aplicar</Label>
                <Input
                  id="montoAplicado"
                  type="number"
                  step="1"
                  max={anticipo.saldoDisponible}
                  value={montoAplicado}
                  onChange={(e) => setMontoAplicado(e.target.value)}
                  className="max-w-[200px]"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notas">Notas (opcional)</Label>
                <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>

              <div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando…' : 'Conciliar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
