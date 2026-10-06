'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Recepcion } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnularRecepcionDialog } from '@/components/recepcion/anular-recepcion-dialog';
import { PageHeader } from '@/components/shell/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatMoney(value: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function RecepcionDetallePage() {
  const params = useParams<{ id: string }>();
  const [recepcion, setRecepcion] = useState<Recepcion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    api
      .get<Recepcion>(`/recepcion/${params.id}`)
      .then(setRecepcion)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la recepción'),
      );
  }, [params.id]);

  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!recepcion) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;

  const analisis = recepcion.analisisCalidad;
  const anulada = recepcion.estado === 'ANULADA';
  const puedeAnular = !anulada && !!user?.permissions.includes('RECEPCION_ANULAR');

  return (
    <div className="p-8">
      <PageHeader
        title={recepcion.codigo}
        description={new Date(recepcion.fecha).toLocaleString('es-CO')}
        actions={
          <div className="flex items-center gap-2">
            {anulada && <Badge variant="destructive">Anulada</Badge>}
            {puedeAnular && (
              <Button variant="destructive" onClick={() => setAnulando(true)}>
                Anular
              </Button>
            )}
          </div>
        }
      />

      {anulada && (
        <div className="mt-6 max-w-2xl rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Esta recepción está anulada</p>
          <p className="mt-1 text-muted-foreground">
            {recepcion.anuladaAt
              ? `${new Date(recepcion.anuladaAt).toLocaleString('es-CO')}. `
              : ''}
            Motivo: {recepcion.motivoAnulacion}
          </p>
        </div>
      )}

      <AnularRecepcionDialog
        recepcion={recepcion}
        open={anulando}
        onOpenChange={setAnulando}
        onAnulada={setRecepcion}
      />

      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Proveedor" value={recepcion.proveedor.nombre} />
          <Field label="Punto de compra" value={recepcion.puntoCompra.nombre} />
          <Field label="Tipo de café" value={recepcion.tipoCafe} />
          <Field label="Peso bruto" value={`${Number(recepcion.pesoBruto)} kg`} />
          <Field label="Tara" value={`${Number(recepcion.pesoTara)} kg`} />
          <Field label="Peso neto" value={`${Number(recepcion.pesoNeto)} kg`} />
          <Field label="Precio por kg" value={formatMoney(recepcion.precioKg)} />
          <Field label="Valor total" value={formatMoney(recepcion.valorTotal)} />
        </CardContent>
      </Card>

      {analisis && (
        <Card className="mt-6 max-w-2xl">
          <CardHeader>
            <CardTitle>Análisis de calidad</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Humedad" value={`${Number(analisis.humedad)}%`} />
            <Field
              label="Factor de rendimiento"
              value={`${Number(analisis.factorRendimiento)} (${analisis.modoFactor})`}
            />
            {analisis.densidad && <Field label="Densidad" value={Number(analisis.densidad)} />}
            {analisis.tamanoGrano && (
              <Field label="Tamaño de grano" value={analisis.tamanoGrano} />
            )}
            {analisis.observaciones && (
              <div className="col-span-2">
                <Field label="Observaciones" value={analisis.observaciones} />
              </div>
            )}
            {analisis.defectos.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Defectos</p>
                <ul className="mt-1 text-sm">
                  {analisis.defectos.map((d) => (
                    <li key={d.id}>
                      {d.defectoTipo.nombre}
                      {d.porcentaje ? ` — ${Number(d.porcentaje)}%` : ''}
                      {d.pesoKg ? ` — ${Number(d.pesoKg)} kg` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
