'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { PuntoCompra, Role, User } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [puntosCompra, setPuntosCompra] = useState<PuntoCompra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setIsLoading(true);
    Promise.all([
      api.get<User[]>('/users'),
      api.get<Role[]>('/roles'),
      api.get<PuntoCompra[]>('/puntos-compra'),
    ])
      .then(([u, r, pc]) => {
        setUsuarios(u);
        setRoles(r);
        setPuntosCompra(pc);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar usuarios'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const toggleRole = (roleId: string, marcado: boolean) => {
    setRoleIds((prev) => {
      const next = new Set(prev);
      if (marcado) next.add(roleId);
      else next.delete(roleId);
      return next;
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !nombre || !password || roleIds.size === 0) {
      setError('Completa correo, nombre, contraseña y al menos un rol');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/users', {
        email,
        nombre,
        password,
        puntoCompraId: puntoCompraId || undefined,
        roleIds: Array.from(roleIds),
      });
      setEmail('');
      setNombre('');
      setPassword('');
      setPuntoCompraId('');
      setRoleIds(new Set());
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActivo = async (usuario: User) => {
    setUpdatingId(usuario.id);
    setError(null);
    try {
      await api.patch(`/users/${usuario.id}`, { activo: !usuario.activo });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el usuario');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Usuarios</h1>

      <form onSubmit={onSubmit} className="mt-6 max-w-2xl rounded-md border p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="puntoCompraId">Punto de compra</Label>
            <Select
              id="puntoCompraId"
              value={puntoCompraId}
              onChange={(e) => setPuntoCompraId(e.target.value)}
            >
              <option value="">Todos los puntos del negocio</option>
              {puntosCompra.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label>Roles</Label>
          <div className="mt-2 flex flex-wrap gap-4">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={roleIds.has(r.id)}
                  onChange={(e) => toggleRole(r.id, e.target.checked)}
                />
                {r.nombre}
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-4">
          {isSubmitting ? 'Creando…' : 'Crear usuario'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 max-w-3xl overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Correo</th>
              <th className="px-4 py-2 font-medium">Roles</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No hay usuarios todavía.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2 font-medium">{u.nombre}</td>
                <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {u.roles.map((r) => r.role.nombre).join(', ') || '—'}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {u.activo ? 'Activo' : 'Inactivo'}
                </td>
                <td className="px-4 py-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingId === u.id}
                    onClick={() => toggleActivo(u)}
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
