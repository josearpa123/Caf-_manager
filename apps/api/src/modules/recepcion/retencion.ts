import { Prisma, TipoCafeRecepcion } from '@prisma/client';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

// Tipos de recepción a los que se les aplica la retención de "compras de café
// pergamino o cereza". El mojado es pergamino húmedo y entra; la pasilla es un
// subproducto de la trilla y NO se incluye. Es una interpretación a confirmar
// con el contador del cliente (ADR-009): para cambiarla basta editar esta lista.
export const TIPOS_CON_RETENCION: ReadonlySet<TipoCafeRecepcion> = new Set([
  TipoCafeRecepcion.PERGAMINO,
  TipoCafeRecepcion.MOJADO,
]);

// Fila vigente de ParametroTributario (leída de la BD por fecha, regla 7).
export interface ParametroRetencion {
  valorUvt: Prisma.Decimal.Value;
  umbralUvt: Prisma.Decimal.Value;
  tarifa: Prisma.Decimal.Value;
}

export interface ResultadoRetencion {
  aplica: boolean;
  // Base mínima en pesos (umbralUvt × valorUvt).
  umbralPesos: Decimal;
  baseRetencion: Decimal | null;
  tarifaRetencion: Decimal | null;
  valorRetencion: Decimal;
  netoPagar: Decimal;
}

// CU-03: si el valor total es igual o superior a la base mínima (umbral en UVT ×
// valor de la UVT), retención = valor total × tarifa, redondeada a centavos
// (mitad hacia arriba). El umbral es "a partir de": exactamente en el umbral sí
// se retiene. Todo en Decimal; nunca number para plata (regla 1).
export function calcularRetencion(
  valorTotal: Prisma.Decimal.Value,
  parametro: ParametroRetencion,
): ResultadoRetencion {
  const total = new Decimal(valorTotal);
  const umbralPesos = new Decimal(parametro.umbralUvt).mul(parametro.valorUvt);
  if (total.lt(umbralPesos)) {
    return {
      aplica: false,
      umbralPesos,
      baseRetencion: null,
      tarifaRetencion: null,
      valorRetencion: new Decimal(0),
      netoPagar: total,
    };
  }
  const tarifa = new Decimal(parametro.tarifa);
  const valorRetencion = total
    .mul(tarifa)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return {
    aplica: true,
    umbralPesos,
    baseRetencion: total,
    tarifaRetencion: tarifa,
    valorRetencion,
    netoPagar: total.minus(valorRetencion),
  };
}
