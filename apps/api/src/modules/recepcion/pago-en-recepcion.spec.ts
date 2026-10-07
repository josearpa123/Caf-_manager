import { BadRequestException } from '@nestjs/common';
import { liquidarPago } from './pago-en-recepcion';

describe('liquidarPago (RF-10)', () => {
  it('sin anticipos paga todo el neto', () => {
    const r = liquidarPago('4278500.00', []);
    expect(r.anticiposAplicados.toString()).toBe('0');
    expect(r.saldoAPagar.toString()).toBe('4278500');
  });

  it('descuenta los anticipos y deja el resto por pagar', () => {
    const r = liquidarPago('1000000.00', [
      { anticipoId: 'a1', montoAplicado: '300000' },
      { anticipoId: 'a2', montoAplicado: '150000.50' },
    ]);
    expect(r.anticiposAplicados.toString()).toBe('450000.5');
    expect(r.saldoAPagar.toString()).toBe('549999.5');
  });

  it('suma en Decimal sin errores de punto flotante', () => {
    const r = liquidarPago('0.30', [
      { anticipoId: 'a1', montoAplicado: '0.10' },
      { anticipoId: 'a2', montoAplicado: '0.20' },
    ]);
    expect(r.saldoAPagar.toString()).toBe('0');
  });

  it('anticipos que cubren todo el neto dejan saldo en cero', () => {
    const r = liquidarPago('500000', [
      { anticipoId: 'a1', montoAplicado: '500000' },
    ]);
    expect(r.saldoAPagar.isZero()).toBe(true);
  });

  it('rechaza aplicar más que el neto a pagar', () => {
    expect(() =>
      liquidarPago('500000', [
        { anticipoId: 'a1', montoAplicado: '500000.01' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rechaza el mismo anticipo dos veces', () => {
    expect(() =>
      liquidarPago('500000', [
        { anticipoId: 'a1', montoAplicado: '100' },
        { anticipoId: 'a1', montoAplicado: '100' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rechaza montos cero o negativos', () => {
    expect(() =>
      liquidarPago('500000', [{ anticipoId: 'a1', montoAplicado: '0' }]),
    ).toThrow(BadRequestException);
    expect(() =>
      liquidarPago('500000', [{ anticipoId: 'a1', montoAplicado: '-5' }]),
    ).toThrow(BadRequestException);
  });
});
