'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { PlanPublico } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const [planes, setPlanes] = useState<PlanPublico[]>([]);

  const [nombreTenant, setNombreTenant] = useState('');
  const [nit, setNit] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [planId, setPlanId] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    api.get<PlanPublico[]>('/registro/planes').then(setPlanes).catch(() => {});
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombreTenant || !adminNombre || !adminEmail || !adminPassword) {
      setError('Completa nombre del negocio, tu nombre, correo y contraseña');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ mensaje: string }>('/registro', {
        nombreTenant,
        nit: nit || undefined,
        adminNombre,
        adminEmail,
        adminPassword,
        planId: planId || undefined,
      });
      setMensaje(res.mensaje);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar el registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mensaje) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cuenta creada</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{mensaje}</p>
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            Volver al inicio
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Crea tu cuenta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Un administrador revisa y activa cada cuenta nueva — te avisamos cuando quede lista.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminNombre">Tu nombre</Label>
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
              autoComplete="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adminPassword">Contraseña</Label>
            <PasswordInput
              id="adminPassword"
              autoComplete="new-password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />
          </div>
          {planes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="planId">Plan (opcional)</Label>
              <Select id="planId" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">Sin definir — lo conversamos al activar tu cuenta</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — hasta {p.maxUsuarios} usuarios
                    {p.maxPuntosCompra ? `, ${p.maxPuntosCompra} puntos de compra` : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isSubmitting} className="mt-1">
            {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
