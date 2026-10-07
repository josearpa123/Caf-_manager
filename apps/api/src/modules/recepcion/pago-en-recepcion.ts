import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

export interface AplicacionAnticipo {
  anticipoId: string;
  montoAplicado: Prisma.Decimal.Value;
}

export interface LiquidacionPago {
  anticiposAplicados: Prisma.Decimal;
  // Lo que se paga en el método elegido tras descontar los anticipos.
  saldoAPagar: Prisma.Decimal;
}

// RF-10: el pago en el mismo paso cubre TODO el neto a pagar: primero los
// anticipos que el operador aplica y el resto con el método elegido. Todo en
// Decimal (regla 1). No hay pagos parciales aquí; para eso está la pantalla de Pagos.
export function liquidarPago(
  netoPagar: Prisma.Decimal.Value,
  aplicaciones: readonly AplicacionAnticipo[],
): LiquidacionPago {
  const neto = new Decimal(netoPagar);
  const vistos = new Set<string>();
  let aplicado = new Decimal(0);

  for (const a of aplicaciones) {
    if (vistos.has(a.anticipoId)) {
      throw new BadRequestException(
        'El mismo anticipo aparece más de una vez; indica un solo monto por anticipo',
      );
    }
    vistos.add(a.anticipoId);
    const monto = new Decimal(a.montoAplicado);
    if (monto.lte(0)) {
      throw new BadRequestException(
        'El monto aplicado de cada anticipo debe ser mayor a cero',
      );
    }
    aplicado = aplicado.plus(monto);
  }

  if (aplicado.gt(neto)) {
    throw new BadRequestException(
      `Los anticipos aplicados (${aplicado.toFixed(2)}) superan el neto a pagar (${neto.toFixed(2)})`,
    );
  }
  return { anticiposAplicados: aplicado, saldoAPagar: neto.minus(aplicado) };
}
