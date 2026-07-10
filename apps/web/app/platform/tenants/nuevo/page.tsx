'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Plan } from '@coffee-manager/shared-types';
import { platformApi, ApiError } from '@/lib/platform-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default function NuevoTenantPage() {
  const router = useRouter();
  const [planes, setPlanes] = useState<Plan[]>([]);

  const [nombreTenant, setNombreTenant] = useState('');
  const [nit, setNit] = useState('');
  const [planId, setPlanId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    platformApi.get<Plan[]>('/platform/planes').then(setPlanes).catch(() => {});
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombreTenant || !adminEmail || !adminNombre || !adminPassword) {
      setError('Completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    try {
      await platformApi.post('/platform/tenants', {
        nombreTenant,
        nit: nit || undefined,
        planId: planId || undefined,
        adminEmail,
        adminNombre,
        adminPassword,
      });
      router.push('/platform');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Nuevo tenant</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Crea el negocio y su primer usuario administrador (rol &quot;Administrador&quot; con
        todos los permisos).
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex max-w-xl flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombreTenant">Nombre del negocio</Label>
            <Input
              id="nombreTenant"
              value={nombreTenant}
              onChange={(e) => setNombreTenant(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nit">NIT (opcional)</Label>
            <Input id="nit" value={nit} onChange={(e) => setNit(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="planId">Plan</Label>
          <Select id="planId" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Sin plan (sin límite de usuarios/puntos de compra)</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — hasta {p.maxUsuarios} usuarios
                {p.maxPuntosCompra ? `, ${p.maxPuntosCompra} puntos de compra` : ''}
              </option>
            ))}
          </Select>
        </div>

        <div className="rounded-md border p-4">
          <p className="text-sm font-medium">Primer usuario administrador</p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adminNombre">Nombre</Label>
              <Input
                id="adminNombre"
                value={adminNombre}
                onChange={(e) => setAdminNombre(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adminEmail">Correo</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adminPassword">Contraseña</Label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear tenant'}
          </Button>
        </div>
      </form>
    </div>
  );
}
