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

// Instante desplazado a hora de Colombia: sus getters UTC devuelven año, mes,
// día y semana tal como se vieron en Bogotá. Solo para agrupar, no para guardar.
export function enHoraColombia(instante: Date): Date {
  return new Date(instante.getTime() + DESFASE_COLOMBIA_MS);
}

// Rango [00:00:00.000, 23:59:59.999] hora Colombia de los días 'AAAA-MM-DD'
// (o ISO completo: solo cuenta la parte de la fecha). Una compra de las 8 p. m.
// cae en su día, no en el siguiente.
export function inicioDiaColombia(dia: string): Date {
  return new Date(`${dia.slice(0, 10)}T05:00:00.000Z`);
}

export function finDiaColombia(dia: string): Date {
  return new Date(inicioDiaColombia(dia).getTime() + 24 * 3600 * 1000 - 1);
}
