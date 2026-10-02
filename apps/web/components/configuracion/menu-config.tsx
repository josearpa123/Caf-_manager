'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Modulo } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Lo que cada módulo hace, en palabras simples, para decidir qué dejar a la vista.
const MODULOS: { modulo: Modulo; titulo: string; ayuda: string }[] = [
  { modulo: Modulo.RECEPCION, titulo: 'Recepción', ayuda: 'Comprar café a los caficultores.' },
  { modulo: Modulo.PROVEEDORES, titulo: 'Proveedores', ayuda: 'La lista de quienes te venden café.' },
  { modulo: Modulo.PAGOS, titulo: 'Pagos', ayuda: 'Pagos y anticipos a los proveedores.' },
  { modulo: Modulo.PRESTAMOS, titulo: 'Préstamos', ayuda: 'Plata que le prestas a un proveedor y sus abonos.' },
  { modulo: Modulo.BODEGA, titulo: 'Bodega', ayuda: 'Cuánto café tienes guardado, secado y trilla.' },
  { modulo: Modulo.VENTAS, titulo: 'Ventas', ayuda: 'Venta del café a compradores y contratos.' },
  { modulo: Modulo.CORTES, titulo: 'Cortes', ayuda: 'Viajes o cortes de café.' },
  { modulo: Modulo.FACTURACION, titulo: 'Facturación', ayuda: 'Facturas y resoluciones.' },
  { modulo: Modulo.REPORTES, titulo: 'Reportes', ayuda: 'Resúmenes del día y descargas.' },
];

// "Qué quiero ver en el menú": oculta lo que el negocio no usa. Es solo visual;
// no quita permisos y los datos siguen ahí.
export function MenuConfig() {
  const { user } = useAuth();
  const [cargado, setCargado] = useState(false);
  const [ocultos, setOcultos] = useState<Modulo[]>([]);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api
      .get<{ modulosOcultos: Modulo[] }>('/tenants/me/configuracion/menu')
      .then((r) => setOcultos(r.modulosOcultos))
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  // Solo los módulos que el plan del negocio incluye.
  const disponibles = MODULOS.filter(
    (m) => !user?.modulos || user.modulos.includes(m.modulo),
  );

  const alternar = (modulo: Modulo, visible: boolean) =>
    setOcultos((prev) =>
      visible ? prev.filter((m) => m !== modulo) : [...prev, modulo],
    );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);
    try {
      await api.patch('/tenants/me/configuracion', { modulosOcultos: ocultos });
      window.dispatchEvent(new Event('menu:actualizar'));
      setMensaje({ ok: true, texto: 'Guardado. El menú ya está actualizado.' });
    } catch (err) {
      setMensaje({
        ok: false,
        texto: err instanceof ApiError ? err.message : 'No se pudo guardar',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card className="mt-6 max-w-xl">
      <CardHeader>
        <CardTitle>Qué quiero ver en el menú</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Quita lo que tu negocio no usa para que el menú sea más corto. No borra nada: puedes
            volver a mostrarlo cuando quieras.
          </p>
          <ul className="flex flex-col gap-2">
            {disponibles.map((m) => (
              <li key={m.modulo}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!ocultos.includes(m.modulo)}
                    onChange={(e) => alternar(m.modulo, e.target.checked)}
                    disabled={!cargado}
                    className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                  />
                  <span>
                    <span className="block text-sm font-medium">{m.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{m.ayuda}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {mensaje && (
            <p
              role={mensaje.ok ? 'status' : 'alert'}
              className={mensaje.ok ? 'text-sm text-primary' : 'text-sm text-destructive'}
            >
              {mensaje.texto}
            </p>
          )}
          <div>
            <Button type="submit" disabled={!cargado || guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
