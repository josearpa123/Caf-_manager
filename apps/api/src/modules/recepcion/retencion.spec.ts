import { TipoCafeRecepcion } from '@prisma/client';
import { calcularRetencion, TIPOS_CON_RETENCION } from './retencion';

// Parámetros de 2026: UVT $52.374, base 70 UVT ($3.666.180), tarifa 0,5 %.
const P2026 = { valorUvt: 52374, umbralUvt: 70, tarifa: '0.005' };

describe('calcularRetencion', () => {
  it('por debajo del umbral no retiene y el neto es el valor total', () => {
    const r = calcularRetencion('3666179.99', P2026);
    expect(r.aplica).toBe(false);
    expect(r.valorRetencion.toString()).toBe('0');
    expect(r.netoPagar.toString()).toBe('3666179.99');
    expect(r.baseRetencion).toBeNull();
    expect(r.tarifaRetencion).toBeNull();
  });

  it('el umbral es "a partir de": exactamente 70 UVT sí retiene', () => {
    const r = calcularRetencion('3666180', P2026);
    expect(r.umbralPesos.toString()).toBe('3666180');
    expect(r.aplica).toBe(true);
    expect(r.valorRetencion.toString()).toBe('18330.9');
    expect(r.netoPagar.toString()).toBe('3647849.1');
  });

  it('retiene el 0,5 % del valor total y guarda base y tarifa', () => {
    const r = calcularRetencion('5000000', P2026);
    expect(r.aplica).toBe(true);
    expect(r.baseRetencion?.toString()).toBe('5000000');
    expect(r.tarifaRetencion?.toString()).toBe('0.005');
    expect(r.valorRetencion.toString()).toBe('25000');
    expect(r.netoPagar.toString()).toBe('4975000');
  });

  it('redondea a centavos con la mitad hacia arriba', () => {
    // 4.000.000,01 × 0,005 = 20.000,00005 → 20.000,00
    expect(
      calcularRetencion('4000000.01', P2026).valorRetencion.toString(),
    ).toBe('20000');
    // 4.000.001,00 × 0,005 = 20.000,005 → 20.000,01
    expect(calcularRetencion('4000001', P2026).valorRetencion.toString()).toBe(
      '20000.01',
    );
  });

  it('sin errores de punto flotante: valor + retención = total', () => {
    const total = '7654321.37';
    const r = calcularRetencion(total, P2026);
    expect(r.netoPagar.plus(r.valorRetencion).toString()).toBe(total);
  });

  it('usa los parámetros recibidos, no valores fijos (regla 7)', () => {
    const otro = { valorUvt: 60000, umbralUvt: 100, tarifa: '0.01' };
    expect(calcularRetencion('5999999', otro).aplica).toBe(false);
    const r = calcularRetencion('6000000', otro);
    expect(r.aplica).toBe(true);
    expect(r.valorRetencion.toString()).toBe('60000');
  });
});

describe('TIPOS_CON_RETENCION', () => {
  it('pergamino y mojado retienen; pasilla no', () => {
    expect(TIPOS_CON_RETENCION.has(TipoCafeRecepcion.PERGAMINO)).toBe(true);
    expect(TIPOS_CON_RETENCION.has(TipoCafeRecepcion.MOJADO)).toBe(true);
    expect(TIPOS_CON_RETENCION.has(TipoCafeRecepcion.PASILLA)).toBe(false);
  });
});
