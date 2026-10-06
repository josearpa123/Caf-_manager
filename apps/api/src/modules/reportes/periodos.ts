import type { Prisma } from '@prisma/client';
import {
  enHoraColombia,
  finDiaColombia,
  inicioDiaColombia,
} from '../../common/fecha-colombia';
import type { AgrupacionCorte } from './dto/query-cortes.dto';

// Períodos y rangos de los reportes, siempre en el día de Colombia (ADR-009).
const MESES_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

// Número de semana ISO-8601 (la semana empieza en lunes; la semana 1 es la que
// contiene el primer jueves del año). Devuelve el año ISO, que puede diferir del
// año calendario en los bordes de diciembre/enero.
function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7; // domingo (0) -> 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // jueves de esta semana
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: d.getUTCFullYear(), week };
}

// Clave ordenable + etiqueta legible del período al que pertenece una fecha,
// según la agrupación pedida.
export function periodoDe(
  fecha: Date,
  agrupacion: AgrupacionCorte,
): { clave: string; etiqueta: string } {
  const local = enHoraColombia(fecha);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  if (agrupacion === 'semana') {
    const { year: wy, week } = isoWeek(local);
    const ww = String(week).padStart(2, '0');
    return { clave: `${wy}-W${ww}`, etiqueta: `Sem ${week} · ${wy}` };
  }
  if (agrupacion === 'trimestre') {
    const q = Math.floor(month / 3) + 1;
    return { clave: `${year}-Q${q}`, etiqueta: `Q${q} ${year}` };
  }
  // mes (por defecto)
  const mm = String(month + 1).padStart(2, '0');
  return { clave: `${year}-${mm}`, etiqueta: `${MESES_ES[month]} ${year}` };
}

export function buildFechaWhere(
  desde?: string,
  hasta?: string,
): Prisma.DateTimeFilter | undefined {
  if (!desde && !hasta) return undefined;
  return {
    gte: desde ? inicioDiaColombia(desde) : undefined,
    lte: hasta ? finDiaColombia(hasta) : undefined,
  };
}
