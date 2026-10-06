import {
  anioColombia,
  diaColombia,
  enHoraColombia,
  finDiaColombia,
  inicioDiaColombia,
  isoDiaColombia,
} from './fecha-colombia';

describe('fecha-colombia (America/Bogota, UTC-5)', () => {
  it.each([
    // 7:00 p. m. en Bogotá ya es el día siguiente en UTC: sigue siendo "hoy" aquí
    ['2026-10-02T00:19:00Z', '2026-10-01'],
    ['2026-10-02T04:59:59Z', '2026-10-01'],
    // 12:00 a. m. en Bogotá: empieza el día
    ['2026-10-02T05:00:00Z', '2026-10-02'],
    ['2026-10-01T12:00:00Z', '2026-10-01'],
  ])('%s UTC → día %s', (utc, esperado) => {
    expect(isoDiaColombia(new Date(utc))).toBe(esperado);
  });

  it('devuelve medianoche UTC, como esperan las columnas @db.Date', () => {
    expect(diaColombia(new Date('2026-10-02T03:00:00Z')).toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
  });

  it('el año cambia a las 5 a. m. UTC del 1 de enero, no a medianoche UTC', () => {
    expect(anioColombia(new Date('2026-12-31T23:59:59Z'))).toBe(2026);
    expect(anioColombia(new Date('2027-01-01T04:59:59Z'))).toBe(2026);
    expect(anioColombia(new Date('2027-01-01T05:00:00Z'))).toBe(2027);
  });
});

describe('rango de días de Colombia', () => {
  it('el día empieza a las 5 a. m. UTC y termina 24 h menos 1 ms después', () => {
    expect(inicioDiaColombia('2026-10-01').toISOString()).toBe(
      '2026-10-01T05:00:00.000Z',
    );
    expect(finDiaColombia('2026-10-01').toISOString()).toBe(
      '2026-10-02T04:59:59.999Z',
    );
  });

  it('acepta un ISO completo y usa solo la fecha', () => {
    expect(inicioDiaColombia('2026-10-01T00:00:00.000Z').toISOString()).toBe(
      '2026-10-01T05:00:00.000Z',
    );
  });

  it('una compra de las 8 p. m. queda dentro de su día', () => {
    const compra = new Date('2026-10-02T01:00:00Z'); // 8 p. m. del 1 de octubre en Bogotá
    expect(compra >= inicioDiaColombia('2026-10-01')).toBe(true);
    expect(compra <= finDiaColombia('2026-10-01')).toBe(true);
    expect(compra > finDiaColombia('2026-09-30')).toBe(true);
  });

  it('enHoraColombia desplaza para agrupar', () => {
    expect(enHoraColombia(new Date('2026-10-02T01:00:00Z')).getUTCDate()).toBe(
      1,
    );
  });
});
