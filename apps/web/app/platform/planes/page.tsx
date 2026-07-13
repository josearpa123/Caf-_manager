'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { MODULOS, type Modulo, type Plan } from '@coffee-manager/shared-types';
import { platformApi, ApiError } from '@/lib/platform-api';
import { PageHeader } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const FORM_VACIO = {
  nombre: '',
  precioMensual: '',
  maxUsuarios: '',
  maxPuntosCompra: '',
};

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Un plan en edición se carga en el mismo formulario; null = creando uno nuevo.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    platformApi
      .get<Plan[]>('/platform/planes')
      .then(setPlanes)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar planes'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const toggleModulo = (modulo: Modulo) => {
    setModulos((prev) =>
      prev.includes(modulo) ? prev.filter((m) => m !== modulo) : [...prev, modulo],
    );
  };

  const resetForm = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setModulos([]);
    setError(null);
  };

  const editar = (plan: Plan) => {
    setEditandoId(plan.id);
    setForm({
      nombre: plan.nombre,
      precioMensual: plan.precioMensual?.toString() ?? '',
      maxUsuarios: plan.maxUsuarios.toString(),
      maxPuntosCompra: plan.maxPuntosCompra?.toString() ?? '',
    });
    setModulos(plan.modulos);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nombre || !form.maxUsuarios) {
      setError('Completa nombre y máximo de usuarios');
      return;
    }

    // null (y no undefined) para que el backend pueda limpiar el campo al
    // editar: un precio o un límite borrado vuelve a "a convenir"/"sin límite".
    const body = {
      nombre: form.nombre,
      precioMensual: form.precioMensual ? Number(form.precioMensual) : null,
      maxUsuarios: Number(form.maxUsuarios),
      maxPuntosCompra: form.maxPuntosCompra ? Number(form.maxPuntosCompra) : null,
      modulos,
    };

    setIsSubmitting(true);
    try {
      if (editandoId) {
        await platformApi.patch(`/platform/planes/${editandoId}`, body);
      } else {
        await platformApi.post('/platform/planes', body);
      }
      resetForm();
      load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `No se pudo ${editandoId ? 'actualizar' : 'crear'} el plan`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Planes"
        description="Arma cada plan con los módulos que incluye y los límites de uso (usuarios y puntos de compra). El tenant solo ve y usa los módulos de su plan; un tenant sin plan asignado no tiene ninguna restricción."
      />

      <form onSubmit={onSubmit} className="mt-6 max-w-4xl rounded-md border p-5">
        <p className="text-sm font-medium">
          {editandoId ? 'Editando plan' : 'Nuevo plan'}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-44"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="precioMensual">Precio mensual (COP)</Label>
            <Input
              id="precioMensual"
              type="number"
              step="1000"
              min="0"
              placeholder="A convenir"
              value={form.precioMensual}
              onChange={(e) => setForm({ ...form, precioMensual: e.target.value })}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maxUsuarios">Máx. usuarios</Label>
            <Input
              id="maxUsuarios"
              type="number"
              step="1"
              min="1"
              value={form.maxUsuarios}
              onChange={(e) => setForm({ ...form, maxUsuarios: e.target.value })}
              className="w-32"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maxPuntosCompra">Máx. puntos de compra</Label>
            <Input
              id="maxPuntosCompra"
              type="number"
              step="1"
              min="1"
              placeholder="Sin límite"
              value={form.maxPuntosCompra}
              onChange={(e) => setForm({ ...form, maxPuntosCompra: e.target.value })}
              className="w-36"
            />
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Módulos incluidos</legend>
          <p className="mt-1 text-xs text-muted-foreground">
            Lo que no marques aparece con una equis en la página pública y queda bloqueado para el
            tenant. La gestión de usuarios, roles, puntos de compra y configuración va siempre
            incluida.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((m) => {
              const activo = modulos.includes(m.value);
              return (
                <label
                  key={m.value}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                    activo ? 'border-primary/50 bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => toggleModulo(m.value)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{m.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {m.descripcion}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando…'
              : editandoId
                ? 'Guardar cambios'
                : 'Crear plan'}
          </Button>
          {editandoId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {modulos.length} de {MODULOS.length} módulos
          </span>
        </div>
      </form>

      <Table className="mt-8 max-w-4xl">
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Límites</TableHead>
            <TableHead>Módulos</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableEmpty colSpan={5}>Cargando…</TableEmpty>}
          {!isLoading && planes.length === 0 && (
            <TableEmpty colSpan={5}>No hay planes todavía.</TableEmpty>
          )}
          {planes.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.nombre}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {p.precioMensual !== null ? `${money.format(p.precioMensual)}/mes` : 'A convenir'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {p.maxUsuarios} usuario{p.maxUsuarios === 1 ? '' : 's'} ·{' '}
                {p.maxPuntosCompra ?? 'sin límite de'} punto
                {p.maxPuntosCompra === 1 ? '' : 's'} de compra
              </TableCell>
              <TableCell>
                {p.modulos.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Ninguno</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {MODULOS.filter((m) => p.modulos.includes(m.value)).map((m) => (
                      <Badge key={m.value} variant="neutral">
                        {m.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => editar(p)}>
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
