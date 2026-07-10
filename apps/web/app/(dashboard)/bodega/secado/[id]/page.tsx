'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import type { ProcesoSecado } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SecadoDetallePage() {
  const params = useParams<{ id: string }>();
  const [proceso, setProceso] = useState<ProcesoSecado | null>(null);
  const [pesoSeco, setPesoSeco] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    api
      .get<ProcesoSecado>(`/bodega/secado/${params.id}`)
      .then(setProceso)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el proceso'),
      );
  };

  useEffect(load, [params.id]);

  const onFinalizar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pesoSeco) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/bodega/secado/${params.id}/finalizar`, {
        pesoSecoResultanteKg: Number(pesoSeco),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo finalizar el proceso');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && !proceso) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!proceso) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">{proceso.codigo}</h1>
      <p className="text-sm text-muted-foreground">{proceso.puntoCompra.nombre}</p>

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Peso mojado total</p>
            <p className="text-sm font-medium">{Number(proceso.pesoMojadoTotalKg)} kg</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estado</p>
            <Badge
              className="mt-1"
              variant={proceso.estado === 'FINALIZADO' ? 'success' : 'warning'}
              dot
            >
              {proceso.estado === 'FINALIZADO' ? 'Finalizado' : 'En proceso'}
            </Badge>
          </div>
          {proceso.estado === 'FINALIZADO' && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Peso seco resultante</p>
                <p className="text-sm font-medium">{Number(proceso.pesoSecoResultanteKg)} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rendimiento de secado</p>
                <p className="text-sm font-medium">{Number(proceso.rendimientoPorcentaje)}%</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Recepciones incluidas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm">
            {proceso.recepciones.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span>
                  {r.recepcion.codigo} — {r.recepcion.proveedor.nombre}
                </span>
                <span className="text-muted-foreground">{Number(r.pesoMojadoAportadoKg)} kg</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {proceso.estado === 'EN_PROCESO' && (
        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle>Finalizar secado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onFinalizar} className="flex items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pesoSeco">Peso seco resultante (kg)</Label>
                <Input
                  id="pesoSeco"
                  type="number"
                  step="0.01"
                  value={pesoSeco}
                  onChange={(e) => setPesoSeco(e.target.value)}
                  className="max-w-[200px]"
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando…' : 'Finalizar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
