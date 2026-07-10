'use client';

import { useEffect, useState } from 'react';
import type { EstadoCuentaProveedor, Proveedor } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

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

export default function EstadoCuentaPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [cuenta, setCuenta] = useState<EstadoCuentaProveedor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Proveedor[]>('/proveedores?activo=true').then(setProveedores).catch(() => {});
  }, []);

  useEffect(() => {
    setCuenta(null);
    setError(null);
    if (!proveedorId) return;
    api
      .get<EstadoCuentaProveedor>(`/pagos/cuenta/${proveedorId}`)
      .then(setCuenta)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el estado de cuenta'),
      );
  }, [proveedorId]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Estado de cuenta por proveedor</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Resumen informativo a partir de compras, pagos y anticipos. La reconciliación entre
        anticipos y compras es manual, así que el saldo estimado es una referencia, no un valor
        autoritativo.
      </p>

      <div className="mt-6 flex max-w-xs flex-col gap-1.5">
        <Label htmlFor="proveedorId">Proveedor</Label>
        <Select
          id="proveedorId"
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
        >
          <option value="">Selecciona…</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {cuenta && (
        <div className="mt-6 grid max-w-3xl grid-cols-3 gap-4">
          <StatCard label="Total comprado" value={formatMoney(cuenta.totalComprado)} />
          <StatCard label="Pagado en efectivo/transf./cheque" value={formatMoney(cuenta.totalPagadoEfectivo)} />
          <StatCard label="Marcado como crédito" value={formatMoney(cuenta.totalPagosCredito)} />
          <StatCard label="Total anticipado" value={formatMoney(cuenta.totalAnticipos)} />
          <StatCard label="Anticipos conciliados" value={formatMoney(cuenta.totalConciliado)} />
          <StatCard label="Anticipos sin conciliar" value={formatMoney(cuenta.anticiposSinConciliar)} />
          <div className="col-span-3">
            <StatCard label="Saldo pendiente estimado" value={formatMoney(cuenta.saldoPendienteEstimado)} />
          </div>
        </div>
      )}
    </div>
  );
}
