'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Role } from '@coffee-manager/shared-types';
import { Permission } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const GRUPOS: Array<{ titulo: string; permisos: Permission[] }> = [
  { titulo: 'Proveedores', permisos: ['PROVEEDORES_VER', 'PROVEEDORES_CREAR', 'PROVEEDORES_EDITAR', 'PROVEEDORES_ELIMINAR'] },
  { titulo: 'Recepción', permisos: ['RECEPCION_VER', 'RECEPCION_CREAR', 'RECEPCION_EDITAR', 'RECEPCION_ELIMINAR'] },
  { titulo: 'Calidad', permisos: ['CALIDAD_VER', 'CALIDAD_EDITAR'] },
  { titulo: 'Precios', permisos: ['PRECIOS_VER', 'PRECIOS_EDITAR'] },
  { titulo: 'Bodega', permisos: ['BODEGA_VER', 'BODEGA_SECADO_GESTIONAR', 'BODEGA_TRILLA_GESTIONAR', 'BODEGA_AJUSTES_GESTIONAR'] },
  { titulo: 'Ventas', permisos: ['VENTAS_VER', 'VENTAS_CREAR', 'VENTAS_EDITAR', 'VENTAS_ELIMINAR'] },
  { titulo: 'Pagos', permisos: ['PAGOS_VER', 'PAGOS_CREAR', 'PAGOS_EDITAR', 'PAGOS_ELIMINAR'] },
  { titulo: 'Anticipos', permisos: ['ANTICIPOS_VER', 'ANTICIPOS_CREAR', 'ANTICIPOS_EDITAR'] },
  { titulo: 'Facturación', permisos: ['FACTURACION_VER', 'FACTURACION_EMITIR', 'FACTURACION_ANULAR'] },
  { titulo: 'Reportes', permisos: ['REPORTES_VER', 'REPORTES_EXPORTAR'] },
  { titulo: 'Usuarios y roles', permisos: ['USUARIOS_VER', 'USUARIOS_GESTIONAR', 'ROLES_GESTIONAR'] },
  { titulo: 'Empresa', permisos: ['PUNTOS_COMPRA_GESTIONAR', 'CONFIGURACION_EMPRESA_GESTIONAR'] },
  { titulo: 'Auditoría', permisos: ['AUDITORIA_VER'] },
];

function PermisosGrid({
  seleccionados,
  onChange,
  disabled,
}: {
  seleccionados: Set<Permission>;
  onChange: (permiso: Permission, marcado: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {GRUPOS.map((g) => (
        <div key={g.titulo} className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-muted-foreground">{g.titulo}</p>
          {g.permisos.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={seleccionados.has(p)}
                disabled={disabled}
                onChange={(e) => onChange(p, e.target.checked)}
              />
              {p}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [permisosNuevo, setPermisosNuevo] = useState<Set<Permission>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [permisosEditando, setPermisosEditando] = useState<Set<Permission>>(new Set());
  const [isSavingEdicion, setIsSavingEdicion] = useState(false);

  const load = () => {
    setIsLoading(true);
    api
      .get<Role[]>('/roles')
      .then(setRoles)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar roles'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre) {
      setError('Ingresa un nombre para el rol');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/roles', {
        nombre,
        descripcion: descripcion || undefined,
        permissions: Array.from(permisosNuevo),
      });
      setNombre('');
      setDescripcion('');
      setPermisosNuevo(new Set());
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el rol');
    } finally {
      setIsSubmitting(false);
    }
  };

  const iniciarEdicion = (rol: Role) => {
    setEditandoId(rol.id);
    setPermisosEditando(new Set(rol.permisos.map((p) => p.permission)));
  };

  const guardarEdicion = async (rolId: string) => {
    setIsSavingEdicion(true);
    setError(null);
    try {
      await api.patch(`/roles/${rolId}/permissions`, {
        permissions: Array.from(permisosEditando),
      });
      setEditandoId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el rol');
    } finally {
      setIsSavingEdicion(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Roles y permisos</h1>

      <form onSubmit={onSubmit} className="mt-6 max-w-3xl rounded-md border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre del rol</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-48" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Input
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
        <div className="mt-4">
          <PermisosGrid
            seleccionados={permisosNuevo}
            onChange={(p, marcado) =>
              setPermisosNuevo((prev) => {
                const next = new Set(prev);
                if (marcado) next.add(p);
                else next.delete(p);
                return next;
              })
            }
          />
        </div>
        <Button type="submit" disabled={isSubmitting} className="mt-4">
          {isSubmitting ? 'Creando…' : 'Crear rol'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex max-w-3xl flex-col gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && roles.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay roles todavía.</p>
        )}
        {roles.map((rol) => (
          <div key={rol.id} className="rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {rol.nombre}
                  {rol.esSistema && (
                    <span className="ml-2 text-xs text-muted-foreground">(fijo)</span>
                  )}
                </p>
                {rol.descripcion && (
                  <p className="text-sm text-muted-foreground">{rol.descripcion}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {rol.permisos.length} permiso(s)
                </p>
              </div>
              {!rol.esSistema && editandoId !== rol.id && (
                <Button variant="outline" size="sm" onClick={() => iniciarEdicion(rol)}>
                  Editar permisos
                </Button>
              )}
            </div>

            {editandoId === rol.id && (
              <div className="mt-4">
                <PermisosGrid
                  seleccionados={permisosEditando}
                  onChange={(p, marcado) =>
                    setPermisosEditando((prev) => {
                      const next = new Set(prev);
                      if (marcado) next.add(p);
                      else next.delete(p);
                      return next;
                    })
                  }
                />
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    disabled={isSavingEdicion}
                    onClick={() => guardarEdicion(rol.id)}
                  >
                    {isSavingEdicion ? 'Guardando…' : 'Guardar'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditandoId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
