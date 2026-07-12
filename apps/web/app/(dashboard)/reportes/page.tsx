'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Truck } from 'lucide-react';
import type {
  AgrupacionCorte,
  PuntoCompra,
  ReportesCortes,
  ReportesDashboard,
} from '@coffee-manager/shared-types';
import { api, ApiError, getToken } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { StatCard } from '@/components/shell/stat-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, HBar } from '@/components/charts/bar-chart';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { tipoCafeVariant } from '@/lib/badge-variants';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

// Versión compacta para etiquetas de gráficos (ej. $1,2 M).
function formatMoneyShort(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
}

function formatKg(value: number) {
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)} kg`;
}

const AGRUPACIONES: { value: 'semana' | 'mes' | 'trimestre'; label: string }[] = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'trimestre', label: 'Trimestre' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReportesPage() {
  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [data, setData] = useState<ReportesDashboard | null>(null);
  const [cortes, setCortes] = useState<ReportesCortes | null>(null);
  const [agrupacion, setAgrupacion] = useState<AgrupacionCorte>('mes');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exportando, setExportando] = useState<'excel' | 'csv' | null>(null);

  useEffect(() => {
    api.get<PuntoCompra[]>('/puntos-compra').then(setPuntosCompra).catch(() => {});
  }, []);

  const baseParams = useCallback(() => {
    const params = new URLSearchParams();
    if (puntoCompraId) params.set('puntoCompraId', puntoCompraId);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    return params;
  }, [puntoCompraId, desde, hasta]);

  const fetchCortes = useCallback(
    (ag: AgrupacionCorte) => {
      const params = baseParams();
      params.set('agrupacion', ag);
      api
        .get<ReportesCortes>(`/reportes/cortes?${params.toString()}`)
        .then(setCortes)
        .catch(() => setCortes(null));
    },
    [baseParams],
  );

  const load = () => {
    setIsLoading(true);
    setError(null);
    api
      .get<ReportesDashboard>(`/reportes/dashboard?${baseParams().toString()}`)
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard'),
      )
      .finally(() => setIsLoading(false));
    fetchCortes(agrupacion);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const onAgrupacionChange = (ag: AgrupacionCorte) => {
    setAgrupacion(ag);
    fetchCortes(ag);
  };

  const exportar = async (tipo: 'excel' | 'csv') => {
    setExportando(tipo);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (puntoCompraId) params.set('puntoCompraId', puntoCompraId);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const path = tipo === 'excel' ? '/reportes/exportar' : '/reportes/compras/exportar';
      const filename = tipo === 'excel' ? 'reportes.xlsx' : 'compras.csv';
      const res = await fetch(`${API_URL}${path}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('No se pudo exportar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError(tipo === 'excel' ? 'No se pudo exportar el Excel' : 'No se pudo exportar el CSV de compras');
    } finally {
      setExportando(null);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Reportes"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportar('csv')} disabled={exportando !== null}>
              <Download className="h-4 w-4" />
              {exportando === 'csv' ? 'Exportando…' : 'Detalle de compras (CSV)'}
            </Button>
            <Button onClick={() => exportar('excel')} disabled={exportando !== null}>
              <Download className="h-4 w-4" />
              {exportando === 'excel' ? 'Exportando…' : 'Exportar a Excel'}
            </Button>
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="puntoCompraId">Punto de compra</Label>
          <Select
            id="puntoCompraId"
            value={puntoCompraId}
            onChange={(e) => setPuntoCompraId(e.target.value)}
            className="w-48"
          >
            <option value="">Todos</option>
            {puntosCompra.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <Button variant="outline" onClick={load} disabled={isLoading}>
          {isLoading ? 'Cargando…' : 'Aplicar filtros'}
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {/* ===================== CORTES DE ENTREGA ===================== */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <Truck className="h-5 w-5 text-primary" />
              Cortes de entrega
            </h2>
            <p className="text-sm text-muted-foreground">
              Lo que despachas por viaje, agrupado por {agrupacion === 'semana' ? 'semana' : agrupacion === 'trimestre' ? 'trimestre' : 'mes'}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border p-0.5">
              {AGRUPACIONES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => onAgrupacionChange(a.value)}
                  className={
                    'rounded px-3 py-1 text-sm transition-colors ' +
                    (agrupacion === a.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground')
                  }
                >
                  {a.label}
                </button>
              ))}
            </div>
            <Link href="/cortes" className={buttonVariants({ variant: 'outline' })}>
              Gestionar cortes
            </Link>
          </div>
        </div>

        {cortes && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
              <StatCard label="Cortes / viajes" value={String(cortes.totales.cortes)} />
              <StatCard label="Total despachado" value={formatKg(cortes.totales.kg)} />
              <StatCard label="Valor total" value={formatMoney(cortes.totales.valor)} />
              <StatCard label="Ticket promedio" value={formatMoney(cortes.totales.ticketPromedio)} />
              <StatCard
                label="Precio promedio/kg"
                value={formatMoney(cortes.totales.precioPromedioKg)}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium">Valor vendido por período</p>
                  <div className="mt-4">
                    <BarChart
                      data={cortes.periodos.map((p) => ({
                        label: p.etiqueta,
                        value: p.valor,
                      }))}
                      formatValue={formatMoneyShort}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium">Kg despachados por período</p>
                  <div className="mt-4">
                    <BarChart
                      data={cortes.periodos.map((p) => ({
                        label: p.etiqueta,
                        value: p.kg,
                      }))}
                      formatValue={(v) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(v)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium">Ventas por comprador</p>
                  <div className="mt-4 flex flex-col gap-3">
                    {cortes.porComprador.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin datos en el período.</p>
                    )}
                    {cortes.porComprador.slice(0, 8).map((c) => (
                      <HBar
                        key={c.compradorNombre}
                        label={`${c.compradorNombre} · ${c.cortes} corte${c.cortes === 1 ? '' : 's'}`}
                        value={c.valor}
                        max={cortes.porComprador[0]?.valor ?? 0}
                        valueText={`${formatMoney(c.valor)} · ${formatKg(c.kg)}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Detalle de cortes</p>
                    <span className="text-xs text-muted-foreground">
                      {cortes.viajes.length} corte{cortes.viajes.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-3 max-h-[320px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Corte</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Kg</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cortes.viajes.length === 0 && (
                          <TableEmpty colSpan={4}>Sin cortes en el período.</TableEmpty>
                        )}
                        {cortes.viajes.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">
                              <Link href={`/cortes/${v.id}`} className="hover:underline">
                                {v.codigo}
                              </Link>
                              {v.destino && (
                                <span className="block text-xs text-muted-foreground">
                                  {v.destino}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(v.fecha)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {v.kg.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatMoney(v.valor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {data && (
        <>
          <h2 className="mt-8 text-lg font-medium">Compras y ventas del período</h2>
          <div className="mt-3 grid max-w-3xl grid-cols-3 gap-4">
            <StatCard label="Total comprado" value={formatMoney(data.compras.totalValor)} />
            <StatCard label="Total vendido" value={formatMoney(data.ventas.totalValor)} />
            <StatCard label="Margen bruto del período" value={formatMoney(data.margenBrutoPeriodo)} />
          </div>

          <div className="mt-4 grid max-w-3xl grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium">Compras por tipo</p>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {data.compras.porTipo.length === 0 && (
                    <li className="text-muted-foreground">Sin datos en el período.</li>
                  )}
                  {data.compras.porTipo.map((c) => (
                    <li key={c.tipoCafe} className="flex items-center justify-between">
                      <Badge variant={tipoCafeVariant(c.tipoCafe)}>
                        {c.tipoCafe} · {c.cantidad}
                      </Badge>
                      <span className="tabular-nums text-muted-foreground">
                        {c.kg.toFixed(2)} kg — {formatMoney(c.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium">Ventas por tipo</p>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {data.ventas.porTipo.length === 0 && (
                    <li className="text-muted-foreground">Sin datos en el período.</li>
                  )}
                  {data.ventas.porTipo.map((v) => (
                    <li key={v.tipoCafe} className="flex items-center justify-between">
                      <Badge variant={tipoCafeVariant(v.tipoCafe)}>
                        {v.tipoCafe} · {v.cantidad}
                      </Badge>
                      <span className="tabular-nums text-muted-foreground">
                        {v.kg.toFixed(2)} kg — {formatMoney(v.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <h2 className="mt-8 text-lg font-medium">Calidad promedio comprada (pergamino)</h2>
          <p className="text-sm text-muted-foreground">
            Solo considera recepciones de pergamino, que son las únicas con análisis de calidad.
          </p>
          <div className="mt-3 grid max-w-3xl grid-cols-3 gap-4">
            <StatCard
              label="Humedad promedio"
              value={
                data.calidadPromedio.humedadPromedio !== null
                  ? `${data.calidadPromedio.humedadPromedio.toFixed(2)}%`
                  : '—'
              }
            />
            <StatCard
              label="Factor de rendimiento promedio"
              value={
                data.calidadPromedio.factorRendimientoPromedio !== null
                  ? data.calidadPromedio.factorRendimientoPromedio.toFixed(2)
                  : '—'
              }
            />
            <StatCard label="Muestras" value={String(data.calidadPromedio.muestras)} />
          </div>

          <h2 className="mt-8 text-lg font-medium">Inventario actual</h2>
          <Table className="mt-3 max-w-2xl">
            <TableHeader>
              <TableRow>
                <TableHead>Punto de compra</TableHead>
                <TableHead>Tipo de café</TableHead>
                <TableHead>Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.inventario.length === 0 && (
                <TableEmpty colSpan={3}>Sin existencias registradas.</TableEmpty>
              )}
              {data.inventario.map((item) => (
                <TableRow key={`${item.puntoCompraId}-${item.tipoCafe}`}>
                  <TableCell>{item.puntoCompraNombre}</TableCell>
                  <TableCell>
                    <Badge variant={tipoCafeVariant(item.tipoCafe)}>{item.tipoCafe}</Badge>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {item.cantidadKg.toFixed(2)} kg
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <h2 className="mt-8 text-lg font-medium">Saldo pendiente a proveedores</h2>
          <p className="text-sm text-muted-foreground">
            Estimado a partir de compras, pagos y anticipos conciliados — no es un saldo
            autoritativo (ver estado de cuenta en Pagos).
          </p>
          <Table className="mt-3 max-w-2xl">
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Saldo pendiente estimado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.saldoProveedores.proveedores.length === 0 && (
                <TableEmpty colSpan={2}>Sin saldos pendientes.</TableEmpty>
              )}
              {data.saldoProveedores.proveedores.map((p) => (
                <TableRow key={p.proveedorId}>
                  <TableCell>{p.proveedorNombre}</TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {formatMoney(p.saldoPendienteEstimado)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="font-medium tabular-nums">
                  {formatMoney(data.saldoProveedores.totalEstimado)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
