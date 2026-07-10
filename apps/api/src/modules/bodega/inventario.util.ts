import { TipoMovimientoInventario } from '@prisma/client';

// Suma un conjunto de filas agrupadas de MovimientoInventario (por
// tipoMovimiento) a un neto en kg. cantidadKg siempre se guarda positivo; el
// signo lo da tipoMovimiento (SALIDA resta, todo lo demás suma).
export function sumarStock(
  filas: {
    tipoMovimiento: TipoMovimientoInventario;
    _sum: { cantidadKg: unknown };
  }[],
): number {
  return filas.reduce((acc, fila) => {
    const monto = Number(fila._sum.cantidadKg ?? 0);
    return (
      acc +
      (fila.tipoMovimiento === TipoMovimientoInventario.SALIDA ? -monto : monto)
    );
  }, 0);
}
