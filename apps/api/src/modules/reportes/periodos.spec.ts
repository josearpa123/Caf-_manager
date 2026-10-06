import { buildFechaWhere, periodoDe } from './periodos';

describe('periodos de reportes (día de Colombia)', () => {
  it('una compra de las 8 p. m. del 30-sep cuenta en septiembre, no en octubre', () => {
    const f = new Date('2026-10-01T01:00:00Z');
    expect(periodoDe(f, 'mes').clave).toBe('2026-09');
    expect(periodoDe(f, 'trimestre').clave).toBe('2026-Q3');
  });

  it('el 31-dic a las 8 p. m. sigue en el año y la semana ISO anteriores', () => {
    const f = new Date('2027-01-01T01:00:00Z');
    expect(periodoDe(f, 'mes').clave).toBe('2026-12');
    expect(periodoDe(f, 'semana').clave).toBe('2026-W53');
  });

  it('desde las 5 a. m. UTC ya es el día siguiente', () => {
    expect(periodoDe(new Date('2026-10-01T05:00:00Z'), 'mes').clave).toBe(
      '2026-10',
    );
  });

  it('el filtro hasta incluye todo el día de Bogotá', () => {
    const w = buildFechaWhere('2026-10-01', '2026-10-01')!;
    expect(w.gte).toEqual(new Date('2026-10-01T05:00:00.000Z'));
    expect(w.lte).toEqual(new Date('2026-10-02T04:59:59.999Z'));
  });

  it('sin fechas no filtra', () => {
    expect(buildFechaWhere()).toBeUndefined();
  });
});
