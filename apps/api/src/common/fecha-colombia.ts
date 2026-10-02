// Zona horaria de la plataforma: America/Bogota, UTC-5 todo el año (Colombia no
// tiene horario de verano). Decisión del usuario, 2026-10-01 (ADR-009): fija
// para toda la plataforma; si algún día hay otro país, pasa a una columna por tenant.
const DESFASE_COLOMBIA_MS = -5 * 60 * 60 * 1000;

// Fecha de calendario de Colombia como `Date` a medianoche UTC, que es como
// Prisma guarda y compara las columnas `@db.Date`. Sin esto, desde las 7 p. m.
// hora Colombia el "día" en UTC ya es el siguiente y no se halla la tabla de
// precios vigente.
export function diaColombia(instante: Date = new Date()): Date {
  const local = new Date(instante.getTime() + DESFASE_COLOMBIA_MS);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
  );
}

// 'AAAA-MM-DD' del día de Colombia.
export function isoDiaColombia(instante: Date = new Date()): string {
  return diaColombia(instante).toISOString().slice(0, 10);
}

// Año calendario en Colombia: el 31 de diciembre a las 8 p. m. todavía es ese año.
export function anioColombia(instante: Date = new Date()): number {
  return diaColombia(instante).getUTCFullYear();
}
