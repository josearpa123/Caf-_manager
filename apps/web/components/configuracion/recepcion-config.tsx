'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Respuesta de GET /tenants/me/configuracion (null si aún no se configuró).
interface ConfiguracionTenant {
  humedadMinAceptable: string | number;
  humedadMaxAceptable: string | number;
  taraPorSacoKg: string | number | null;
  esAgenteRetencion: boolean;
}

const num = (texto: string) => {
  const t = texto.trim().replace(',', '.');
  return t === '' ? NaN : Number(t);
};

// Valores que usa la recepción rápida: el peso del saco vacío (para calcular la
// tara con el número de sacos) y el rango de humedad aceptable.
export function RecepcionConfig() {
  const [cargado, setCargado] = useState(false);
  const [taraPorSaco, setTaraPorSaco] = useState('');
  const [humedadMin, setHumedadMin] = useState('10');
  const [humedadMax, setHumedadMax] = useState('12');
  const [esAgente, setEsAgente] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api
      .get<ConfiguracionTenant | null>('/tenants/me/configuracion')
      .then((c) => {
        if (c) {
          setHumedadMin(String(Number(c.humedadMinAceptable)));
          setHumedadMax(String(Number(c.humedadMaxAceptable)));
          setTaraPorSaco(c.taraPorSacoKg ? String(Number(c.taraPorSacoKg)) : '');
          setEsAgente(c.esAgenteRetencion);
        }
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    const tara = num(taraPorSaco);
    const min = num(humedadMin);
    const max = num(humedadMax);
    if (!(tara > 0)) return setMensaje({ ok: false, texto: 'Escribe el peso del saco en kg' });
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      return setMensaje({ ok: false, texto: 'El rango de humedad no es válido' });
    }
    setGuardando(true);
    try {
      await api.patch('/tenants/me/configuracion', {
        taraPorSacoKg: tara,
        humedadMinAceptable: min,
        humedadMaxAceptable: max,
        esAgenteRetencion: esAgente,
      });
      setMensaje({ ok: true, texto: 'Guardado' });
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
        <CardTitle>Recepción</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfg-tara">Peso del saco vacío (kg)</Label>
            <Input
              id="cfg-tara"
              inputMode="decimal"
              value={taraPorSaco}
              onChange={(e) => setTaraPorSaco(e.target.value)}
              disabled={!cargado}
              className="max-w-[160px]"
            />
            <p className="text-xs text-muted-foreground">
              Con él la recepción calcula la tara: sacos × este peso.
            </p>
          </div>
          <div className="grid max-w-xs grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-hmin">Humedad mínima (%)</Label>
              <Input
                id="cfg-hmin"
                inputMode="decimal"
                value={humedadMin}
                onChange={(e) => setHumedadMin(e.target.value)}
                disabled={!cargado}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-hmax">Humedad máxima (%)</Label>
              <Input
                id="cfg-hmax"
                inputMode="decimal"
                value={humedadMax}
                onChange={(e) => setHumedadMax(e.target.value)}
                disabled={!cargado}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 rounded-md border p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={esAgente}
                onChange={(e) => setEsAgente(e.target.checked)}
                disabled={!cargado}
                className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
              <span>
                <span className="block text-sm font-medium">Soy agente de retención en la fuente</span>
                <span className="block text-xs text-muted-foreground">
                  Si lo activas, cada compra de café pergamino o mojado cuyo valor llegue a la base mínima
                  (70 UVT) retiene el 0,5 % y se muestra el neto a pagar. La base, la tarifa y la UVT
                  vigentes las mantiene la plataforma. Confírmalo con tu contador.
                </span>
              </span>
            </label>
          </div>
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
