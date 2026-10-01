import { Prisma, TipoConsecutivo } from '@prisma/client';

// Prefijo del código por tipo de documento (ej. REC-2026-000123).
export const PREFIJO_CONSECUTIVO: Record<TipoConsecutivo, string> = {
  RECEPCION: 'REC',
  SECADO: 'SEC',
  TRILLA: 'TRI',
  PRESTAMO: 'PRE',
  VENTA: 'VTA',
  CONTRATO_VENTA: 'CTR',
  VIAJE: 'CORTE',
};

// Lo mínimo que se necesita del cliente de la transacción; así sirve tanto
// con el cliente base como con el extendido por tenant.
interface ClienteRaw {
  $queryRaw<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: unknown[]
  ): Prisma.PrismaPromise<T>;
}

// Devuelve el siguiente código (PREFIJO-AÑO-NNNNNN) para un tenant y tipo.
//
// Es una única sentencia INSERT … ON CONFLICT DO UPDATE … RETURNING: atómica,
// así que dos llamadas simultáneas del mismo tenant y tipo nunca obtienen el
// mismo número (se serializan en la fila del contador, milisegundos). Nunca
// usar count() + 1.
//
// Se llama con el cliente normal ANTES de abrir la transacción de negocio, no
// dentro de ella: si el candado de la fila se retuviera hasta el COMMIT, N
// peticiones simultáneas del mismo tenant ocuparían las N conexiones del pool
// esperándolo, y la auditoría (que usa otra conexión) no podría avanzar.
// Consecuencia: si la transacción de negocio falla después, el número queda
// sin usar (hueco). Nunca se repite.
//
// Va con SQL explícito (no pasa por la extensión de tenant), por eso el
// tenantId se pasa como parámetro y nunca viene del cliente HTTP.
export async function siguienteConsecutivo(
  tx: ClienteRaw,
  tenantId: string,
  tipo: TipoConsecutivo,
  fecha: Date,
): Promise<string> {
  const anio = fecha.getUTCFullYear();
  const prefijo = PREFIJO_CONSECUTIVO[tipo];
  const filas = await tx.$queryRaw<{ valorActual: number }[]>`
    INSERT INTO "Consecutivo" ("tenantId", "tipo", "anio", "prefijo", "valorActual", "updatedAt")
    VALUES (${tenantId}, ${tipo}::"TipoConsecutivo", ${anio}, ${prefijo}, 1, now())
    ON CONFLICT ("tenantId", "tipo", "anio")
    DO UPDATE SET "valorActual" = "Consecutivo"."valorActual" + 1, "updatedAt" = now()
    RETURNING "valorActual"`;
  return `${prefijo}-${anio}-${String(filas[0].valorActual).padStart(6, '0')}`;
}
