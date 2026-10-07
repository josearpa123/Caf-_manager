'use client';

import { useEffect, useState } from 'react';
import type { AnticipoDisponible } from '@coffee-manager/shared-types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type MetodoPagoRapido = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE';

const METODOS: { valor: MetodoPagoRapido; etiqueta: string }[] = [
  { valor: 'EFECTIVO', etiqueta: 'Efectivo' },
  { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia' },
  { valor: 'CHEQUE', etiqueta: 'Cheque' },
];

export interface PagoForm {
  pagarAhora: boolean;
  metodo: MetodoPagoRapido;
  numeroCheque: string;
  // anticipoId → monto que se aplica (texto, como lo digita el usuario)
  aplicado: Record<string, string>;
}

export const PAGO_INICIAL: PagoForm = {
  pagarAhora: false,
  metodo: 'EFECTIVO',
  numeroCheque: '',
  aplicado: {},
};

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

// Acepta coma decimal. Vacío o inválido → 0.
export function montoDigitado(texto: string | undefined): number {
  const t = (texto ?? '').trim().replace(',', '.');
  const n = t === '' ? 0 : Number(t);
  return Number.isFinite(n) ? n : 0;
}

export function totalAplicado(aplicado: Record<string, string>): number {
  return (
    Math.round(
      Object.values(aplicado).reduce((acc, t) => acc + montoDigitado(t), 0) * 100,
    ) / 100
  );
}

interface Props {
  proveedorId: string | null;
  // Neto a pagar de la compra (después de retención); NaN si aún no se puede calcular.
  neto: number;
  value: PagoForm;
  onChange: (v: PagoForm) => void;
}

// RF-10: pagar en el mismo paso de la compra. Primero se descuentan los anticipos
// del proveedor y el resto se paga con el método elegido.
export function PagoEnRecepcion({ proveedorId, neto, value, onChange }: Props) {
  const [anticipos, setAnticipos] = useState<AnticipoDisponible[]>([]);

  useEffect(() => {
    setAnticipos([]);
    if (!proveedorId) return;
    let vigente = true;
    api
      .get<AnticipoDisponible[]>(`/anticipos/disponibles?proveedorId=${proveedorId}`)
      .then((lista) => vigente && setAnticipos(lista))
      // Sin permiso de ver anticipos (o sin conexión): se paga sin descontarlos.
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [proveedorId]);

  const set = (parcial: Partial<PagoForm>) => onChange({ ...value, ...parcial });
  const aplicado = totalAplicado(value.aplicado);
  const saldo = Number.isFinite(neto) ? Math.round((neto - aplicado) * 100) / 100 : NaN;

  return (
    <section aria-label="Pago" className="flex flex-col gap-3">
      <Label>¿Pagas ahora?</Label>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            [true, 'Pagar ahora'],
            [false, 'Dejar por pagar'],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={etiqueta}
            type="button"
            onClick={() => set({ pagarAhora: valor })}
            aria-pressed={value.pagarAhora === valor}
            className={cn(
              'min-h-11 rounded-md border px-2 text-sm transition-colors',
              value.pagarAhora === valor
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-input bg-background hover:bg-accent',
            )}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {value.pagarAhora && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          {anticipos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Anticipos de este proveedor</p>
              {anticipos.map((a) => {
                const disponible = Number(a.saldoDisponible);
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p>{new Date(a.fecha).toLocaleDateString('es-CO')}</p>
                      <p className="text-xs text-muted-foreground">
                        Disponible {COP.format(disponible)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        data-nav="1"
                        aria-label={`Aplicar del anticipo del ${new Date(a.fecha).toLocaleDateString('es-CO')}`}
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0"
                        value={value.aplicado[a.id] ?? ''}
                        onChange={(e) =>
                          set({ aplicado: { ...value.aplicado, [a.id]: e.target.value } })
                        }
                        onFocus={(e) => e.target.select()}
                        className="h-11 w-32 text-right"
                      />
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() =>
                          set({
                            aplicado: {
                              ...value.aplicado,
                              [a.id]: String(
                                Number.isFinite(neto)
                                  ? Math.min(
                                      disponible,
                                      Math.max(0, neto - (aplicado - montoDigitado(value.aplicado[a.id]))),
                                    )
                                  : disponible,
                              ),
                            },
                          })
                        }
                      >
                        usar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Lo que falta se paga en</Label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  onClick={() => set({ metodo: m.valor })}
                  aria-pressed={value.metodo === m.valor}
                  className={cn(
                    'min-h-11 rounded-md border px-1 text-sm transition-colors',
                    value.metodo === m.valor
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-input bg-background hover:bg-accent',
                  )}
                >
                  {m.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {value.metodo === 'CHEQUE' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rr-cheque">Número de cheque</Label>
              <Input
                id="rr-cheque"
                data-nav="1"
                autoComplete="off"
                value={value.numeroCheque}
                onChange={(e) => set({ numeroCheque: e.target.value })}
                className="h-12 text-lg"
              />
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Anticipos aplicados</dt>
              <dd className="font-medium">{COP.format(aplicado)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Se paga ahora</dt>
              <dd className={cn('text-lg font-semibold', saldo < 0 && 'text-destructive')}>
                {Number.isFinite(saldo) ? COP.format(saldo) : '—'}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
