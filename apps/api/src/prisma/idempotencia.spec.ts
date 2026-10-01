import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  buscarResultadoIdempotente,
  hashSolicitud,
  reservarLlave,
  TTL_IDEMPOTENCIA_MS,
  validarLlave,
} from './idempotencia';

describe('validarLlave', () => {
  it('sin encabezado devuelve undefined (la llave es opcional)', () => {
    expect(validarLlave(undefined)).toBeUndefined();
  });

  it.each(['abcdefgh', 'a1b2c3d4-e5f6_7890', 'x'.repeat(128)])(
    'acepta %p',
    (llave) => {
      expect(validarLlave(llave)).toBe(llave);
    },
  );

  it.each(['', 'corta', 'x'.repeat(129), 'con espacios aqui', 'ñandú-12345'])(
    'rechaza %p',
    (llave) => {
      expect(() => validarLlave(llave)).toThrow(BadRequestException);
    },
  );
});

describe('hashSolicitud', () => {
  it('es estable ante el orden de las propiedades, también anidadas', () => {
    const a = { x: 1, y: { b: 2, a: [1, { d: 4, c: 3 }] } };
    const b = { y: { a: [1, { c: 3, d: 4 }], b: 2 }, x: 1 };
    expect(hashSolicitud(a)).toBe(hashSolicitud(b));
  });

  it('ignora propiedades undefined', () => {
    expect(hashSolicitud({ a: 1, b: undefined })).toBe(hashSolicitud({ a: 1 }));
  });

  it('cambia si cambia un valor, y el orden de un arreglo importa', () => {
    expect(hashSolicitud({ peso: 100 })).not.toBe(hashSolicitud({ peso: 101 }));
    expect(hashSolicitud({ l: [1, 2] })).not.toBe(hashSolicitud({ l: [2, 1] }));
  });
});

describe('buscarResultadoIdempotente', () => {
  const db = (filas: unknown[]) => ({
    $queryRaw: jest.fn().mockResolvedValue(filas),
    $executeRaw: jest.fn(),
  });

  it('devuelve null si la llave es nueva o venció', async () => {
    expect(
      await buscarResultadoIdempotente(db([]), 't1', 'RECEPCION', 'k', 'h'),
    ).toBeNull();
  });

  it('devuelve el id del documento si el cuerpo coincide', async () => {
    const r = await buscarResultadoIdempotente(
      db([{ hashSolicitud: 'h', recursoId: 'rec-1' }]),
      't1',
      'RECEPCION',
      'k',
      'h',
    );
    expect(r).toBe('rec-1');
  });

  it('lanza 409 si la misma llave llega con otro cuerpo', async () => {
    await expect(
      buscarResultadoIdempotente(
        db([{ hashSolicitud: 'otro', recursoId: 'rec-1' }]),
        't1',
        'RECEPCION',
        'k',
        'h',
      ),
    ).rejects.toThrow(ConflictException);
  });
});

describe('reservarLlave', () => {
  it('true si insertó o reemplazó una vencida, false si ya existía vigente', async () => {
    const insertada = {
      $queryRaw: jest.fn().mockResolvedValue([{ llave: 'k' }]),
    };
    const existente = { $queryRaw: jest.fn().mockResolvedValue([]) };
    expect(await reservarLlave(insertada as never, 't1', 'R', 'k', 'h')).toBe(
      true,
    );
    expect(await reservarLlave(existente as never, 't1', 'R', 'k', 'h')).toBe(
      false,
    );
  });

  it('la vigencia es de 24 horas', () => {
    expect(TTL_IDEMPOTENCIA_MS).toBe(86_400_000);
  });
});
