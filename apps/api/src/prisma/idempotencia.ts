import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Cuánto vive una llave. Pasado ese tiempo, la misma llave se acepta como una
// operación nueva. La limpieza de filas vencidas va a la cola (Sprint 3).
export const TTL_IDEMPOTENCIA_MS = 24 * 60 * 60 * 1000;

const LLAVE_VALIDA = /^[A-Za-z0-9_-]{8,128}$/;

// Se lanza dentro de la transacción de negocio cuando otra petición con la
// misma llave ya confirmó: hace rollback de todo y el servicio responde con el
// resultado de la primera.
export class IdempotenciaDuplicada extends Error {
  constructor() {
    super('Llave de idempotencia ya usada');
  }
}

// Lo mínimo que se necesita del cliente; sirve con el cliente base, el
// extendido por tenant y el de una transacción.
interface ClienteRaw {
  $queryRaw<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: unknown[]
  ): Prisma.PrismaPromise<T>;
  $executeRaw(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: unknown[]
  ): Prisma.PrismaPromise<number>;
}

// Valida el encabezado `Idempotency-Key`. Es opcional: sin llave la operación
// se comporta como siempre.
export function validarLlave(llave: string | undefined): string | undefined {
  if (llave === undefined) return undefined;
  if (!LLAVE_VALIDA.test(llave)) {
    throw new BadRequestException(
      'Idempotency-Key debe tener 8 a 128 caracteres (letras, números, guion o guion bajo)',
    );
  }
  return llave;
}

// Huella estable del cuerpo: el orden de las propiedades no cambia el hash.
export function hashSolicitud(cuerpo: unknown): string {
  const ordenar = (valor: unknown): unknown => {
    if (Array.isArray(valor)) return valor.map(ordenar);
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(
        Object.entries(valor as Record<string, unknown>)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => [k, ordenar(v)]),
      );
    }
    return valor;
  };
  return createHash('sha256')
    .update(JSON.stringify(ordenar(cuerpo)))
    .digest('hex');
}

// ¿Esta llave ya produjo un documento? Devuelve su id, o null si es nueva (o
// venció). Misma llave con otro cuerpo → 409: es un error del cliente, no un
// reintento. Va con SQL explícito: el tenantId viene del JWT, nunca del cliente.
export async function buscarResultadoIdempotente(
  db: ClienteRaw,
  tenantId: string,
  alcance: string,
  llave: string,
  hash: string,
): Promise<string | null> {
  const filas = await db.$queryRaw<
    { hashSolicitud: string; recursoId: string | null }[]
  >`SELECT "hashSolicitud", "recursoId" FROM "IdempotencyKey"
    WHERE "tenantId" = ${tenantId} AND "alcance" = ${alcance}
      AND "llave" = ${llave} AND "expiraEn" > now()`;
  if (filas.length === 0) return null;
  if (filas[0].hashSolicitud !== hash) {
    throw new ConflictException(
      'La llave de idempotencia ya se usó con otra solicitud distinta',
    );
  }
  return filas[0].recursoId;
}

// Reserva la llave. Debe ser lo PRIMERO que se hace dentro de la transacción de
// negocio: si otra petición con la misma llave está en curso, esta sentencia
// espera a que esa haga COMMIT (entonces devuelve false) o ROLLBACK (entonces
// reserva). Así no hace falta un estado "en proceso" ni tiempos de espera: la
// llave y el documento se confirman juntos o ninguno. Una llave vencida se
// reemplaza.
export async function reservarLlave(
  db: ClienteRaw,
  tenantId: string,
  alcance: string,
  llave: string,
  hash: string,
): Promise<boolean> {
  const expiraEn = new Date(Date.now() + TTL_IDEMPOTENCIA_MS);
  const filas = await db.$queryRaw<{ llave: string }[]>`
    INSERT INTO "IdempotencyKey" ("tenantId", "alcance", "llave", "hashSolicitud", "expiraEn")
    VALUES (${tenantId}, ${alcance}, ${llave}, ${hash}, ${expiraEn})
    ON CONFLICT ("tenantId", "alcance", "llave") DO UPDATE
      SET "hashSolicitud" = EXCLUDED."hashSolicitud", "recursoId" = NULL,
          "createdAt" = now(), "expiraEn" = EXCLUDED."expiraEn"
      WHERE "IdempotencyKey"."expiraEn" <= now()
    RETURNING "llave"`;
  return filas.length > 0;
}

// Anota el documento creado, dentro de la misma transacción de la reserva.
export async function completarLlave(
  db: ClienteRaw,
  tenantId: string,
  alcance: string,
  llave: string,
  recursoId: string,
): Promise<void> {
  await db.$executeRaw`UPDATE "IdempotencyKey" SET "recursoId" = ${recursoId}
    WHERE "tenantId" = ${tenantId} AND "alcance" = ${alcance} AND "llave" = ${llave}`;
}
