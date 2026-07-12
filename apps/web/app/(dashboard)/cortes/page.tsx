'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Truck } from 'lucide-react';
import type { Viaje } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { StatCard } from '@/components/shell/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CortesPage() {
  const router = useRouter();
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    fecha: hoyISO(),
    destino: '',
    placa: '',
    observaciones: '',
  });

  const load = () => {
    setIsLoading(true);
    api
      .get<Viaje[]>('/viajes')
      .then(setViajes)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar los cortes'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const crear = async () => {
    setGuardando(true);
    setError(null);
    try {
      const viaje = await api.post<Viaje>('/viajes', {
        fecha: form.fecha ? new Date(form.fecha).toISOString() : undefined,
        destino: form.destino || undefined,
        placa: form.placa || undefined,
        observaciones: form.observaciones || undefined,
      });
      setDialogOpen(false);
      setForm({ fecha: hoyISO(), destino: '', placa: '', observaciones: '' });
      router.push(`/cortes/${viaje.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el corte');
    } finally {
      setGuardando(false);
    }
  };

  const totalValor = viajes.reduce((acc, v) => acc + v.totalValor, 0);
  const totalKg = viajes.reduce((acc, v) => acc + v.totalKg, 0);

  return (
    <div className="p-8">
      <PageHeader
        title="Cortes de entrega"
        description="Cada corte es un despacho/viaje que agrupa varias ventas."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo corte
          </Button>
        }
      />

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 grid max-w-3xl grid-cols-3 gap-4">
        <StatCard label="Cortes registrados" value={String(viajes.length)} />
        <StatCard label="Total despachado" value={`${totalKg.toFixed(0)} kg`} />
        <StatCard label="Valor total" value={formatMoney(totalValor)} />
      </div>

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Destino</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Ventas</TableHead>
            <TableHead className="text-right">Kg</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && viajes.length === 0 && (
            <TableEmpty colSpan={7}>
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <Truck className="h-6 w-6" />
                Aún no hay cortes. Crea el primero con “Nuevo corte”.
              </div>
            </TableEmpty>
          )}
          {viajes.map((v) => (
            <TableRow
              key={v.id}
              className="cursor-pointer"
              onClick={() => router.push(`/cortes/${v.id}`)}
            >
              <TableCell className="font-medium">
                <Link href={`/cortes/${v.id}`} className="hover:underline">
                  {v.codigo}
                </Link>
              </TableCell>
              <TableCell>{formatDate(v.fecha)}</TableCell>
              <TableCell>{v.destino ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={v.estado === 'CERRADO' ? 'neutral' : 'success'}>
                  {v.estado === 'CERRADO' ? 'Cerrado' : 'Abierto'}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{v.ventas}</TableCell>
              <TableCell className="text-right tabular-nums">{v.totalKg.toFixed(2)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatMoney(v.totalValor)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader onClose={() => setDialogOpen(false)}>
            <DialogTitle>Nuevo corte de entrega</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fecha">Fecha del despacho</Label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="destino">Destino / trilladora (opcional)</Label>
              <Input
                id="destino"
                value={form.destino}
                placeholder="Ej. Trilladora El Roble"
                onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="placa">Placa del vehículo (opcional)</Label>
              <Input
                id="placa"
                value={form.placa}
                placeholder="Ej. ABC123"
                onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Input
                id="observaciones"
                value={form.observaciones}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={crear} disabled={guardando}>
              {guardando ? 'Creando…' : 'Crear y asignar ventas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
