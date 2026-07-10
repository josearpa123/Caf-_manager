'use client';

import { useEffect, useState } from 'react';
import type { PuntoCompra, ReportesDashboard } from '@coffee-manager/shared-types';
import { api, ApiError, getToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function ReportesPage() {
  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [data, setData] = useState<ReportesDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    api.get<PuntoCompra[]>('/puntos-compra').then(setPuntosCompra).catch(() => {});
  }, []);

  const load = () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (puntoCompraId) params.set('puntoCompraId', puntoCompraId);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    api
      .get<ReportesDashboard>(`/reportes/dashboard?${params.toString()}`)
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const exportarCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (puntoCompraId) params.set('puntoCompraId', puntoCompraId);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await fetch(`${API_URL}/reportes/compras/exportar?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('No se pudo exportar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compras.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo exportar el CSV de compras');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <Button variant="outline" onClick={exportarCsv} disabled={isExporting}>
          {isExporting ? 'Exportando…' : 'Exportar compras (CSV)'}
        </Button>
      </div>

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

      {data && (
        <>
          <h2 className="mt-8 text-lg font-medium">Compras y ventas del período</h2>
          <div className="mt-3 grid max-w-3xl grid-cols-3 gap-4">
            <StatCard label="Total comprado" value={formatMoney(data.compras.totalValor)} />
            <StatCard label="Total vendido" value={formatMoney(data.ventas.totalValor)} />
            <StatCard label="Margen bruto del período" value={formatMoney(data.margenBrutoPeriodo)} />
          </div>

          <div className="mt-4 grid max-w-3xl grid-cols-2 gap-4">
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Compras por tipo</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                {data.compras.porTipo.length === 0 && <li>Sin datos en el período.</li>}
                {data.compras.porTipo.map((c) => (
                  <li key={c.tipoCafe} className="flex justify-between">
                    <span>
                      {c.tipoCafe} ({c.cantidad})
                    </span>
                    <span>
                      {c.kg.toFixed(2)} kg — {formatMoney(c.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Ventas por tipo</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                {data.ventas.porTipo.length === 0 && <li>Sin datos en el período.</li>}
                {data.ventas.porTipo.map((v) => (
                  <li key={v.tipoCafe} className="flex justify-between">
                    <span>
                      {v.tipoCafe} ({v.cantidad})
                    </span>
                    <span>
                      {v.kg.toFixed(2)} kg — {formatMoney(v.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
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
          <div className="mt-3 max-w-2xl overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Punto de compra</th>
                  <th className="px-4 py-2 font-medium">Tipo de café</th>
                  <th className="px-4 py-2 font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {data.inventario.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      Sin existencias registradas.
                    </td>
                  </tr>
                )}
                {data.inventario.map((item) => (
                  <tr key={`${item.puntoCompraId}-${item.tipoCafe}`} className="border-t">
                    <td className="px-4 py-2">{item.puntoCompraNombre}</td>
                    <td className="px-4 py-2 text-muted-foreground">{item.tipoCafe}</td>
                    <td className="px-4 py-2 font-medium">{item.cantidadKg.toFixed(2)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-8 text-lg font-medium">Saldo pendiente a proveedores</h2>
          <p className="text-sm text-muted-foreground">
            Estimado a partir de compras, pagos y anticipos conciliados — no es un saldo
            autoritativo (ver estado de cuenta en Pagos).
          </p>
          <div className="mt-3 max-w-2xl overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Proveedor</th>
                  <th className="px-4 py-2 font-medium">Saldo pendiente estimado</th>
                </tr>
              </thead>
              <tbody>
                {data.saldoProveedores.proveedores.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                      Sin saldos pendientes.
                    </td>
                  </tr>
                )}
                {data.saldoProveedores.proveedores.map((p) => (
                  <tr key={p.proveedorId} className="border-t">
                    <td className="px-4 py-2">{p.proveedorNombre}</td>
                    <td className="px-4 py-2 font-medium">
                      {formatMoney(p.saldoPendienteEstimado)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-secondary/30">
                  <td className="px-4 py-2 font-medium">Total</td>
                  <td className="px-4 py-2 font-medium">
                    {formatMoney(data.saldoProveedores.totalEstimado)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
