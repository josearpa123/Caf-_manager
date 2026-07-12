'use client';

import { cn } from '@/lib/utils';

export interface BarDatum {
  label: string;
  value: number;
  /** Texto opcional para el tooltip (si no, se usa el valor formateado). */
  hint?: string;
}

interface BarChartProps {
  data: BarDatum[];
  /** Formatea el valor para las etiquetas y tooltips. */
  formatValue?: (value: number) => string;
  /** Alto del área de barras en px. */
  height?: number;
  /** Muestra la etiqueta del valor encima de cada barra. */
  showValues?: boolean;
  emptyLabel?: string;
  className?: string;
}

// Gráfico de barras verticales, 100% CSS (sin dependencias). Responsivo:
// si hay muchas columnas, el área hace scroll horizontal. Usa los tokens del
// design system, así que respeta claro/oscuro automáticamente.
export function BarChart({
  data,
  formatValue = (v) => String(v),
  height = 200,
  showValues = true,
  emptyLabel = 'Sin datos en el período.',
  className,
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 0);

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <div className="flex items-end gap-3" style={{ minWidth: data.length * 44 }}>
        {data.map((d, i) => {
          const pct = max > 0 ? (d.value / max) * 100 : 0;
          const valueText = d.hint ?? formatValue(d.value);
          return (
            <div
              key={`${d.label}-${i}`}
              className="flex min-w-[32px] flex-1 flex-col items-center gap-1.5"
            >
              {showValues && (
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                  {d.value > 0 ? formatValue(d.value) : ''}
                </span>
              )}
              <div
                className="flex w-full items-end rounded-t bg-muted/60"
                style={{ height }}
                title={`${d.label}: ${valueText}`}
              >
                <div
                  className="w-full rounded-t bg-primary transition-[height] duration-500 ease-out"
                  style={{ height: `${pct}%`, minHeight: d.value > 0 ? 3 : 0 }}
                />
              </div>
              <span className="w-full truncate text-center text-[11px] text-muted-foreground">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface HBarProps {
  label: string;
  value: number;
  max: number;
  valueText: string;
  className?: string;
}

// Barra horizontal individual (para rankings, ej. ventas por comprador).
export function HBar({ label, value, max, valueText, className }: HBarProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate">{label}</span>
        <span className="tabular-nums text-muted-foreground">{valueText}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
