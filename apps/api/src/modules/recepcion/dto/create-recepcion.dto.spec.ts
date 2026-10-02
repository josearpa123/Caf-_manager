import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRecepcionDto } from './create-recepcion.dto';

const base = {
  puntoCompraId: 'pc1',
  proveedorId: 'p1',
  pesoBruto: 110,
  pesoTara: 10,
};
const calidad = {
  humedad: 11,
  modoFactor: 'CALCULADO',
  pesoMuestraKg: 0.5,
  pesoAlmendraMuestraKg: 0.4,
};
const errores = async (plano: object) =>
  (await validate(plainToInstance(CreateRecepcionDto, plano))).map(
    (e) => e.property,
  );

describe('CreateRecepcionDto · café seco', () => {
  it('pergamino por calidad es válido', async () => {
    expect(
      await errores({
        ...base,
        tipoCafe: 'PERGAMINO',
        analisisCalidad: calidad,
      }),
    ).toEqual([]);
  });

  it('pergamino a precio por kilo (sin calidad) es válido', async () => {
    expect(
      await errores({ ...base, tipoCafe: 'PERGAMINO', precioKg: 18000 }),
    ).toEqual([]);
  });

  it('pergamino sin calidad ni precio es inválido', async () => {
    // Sin calidad, el precio por kilo pasa a ser obligatorio.
    expect(await errores({ ...base, tipoCafe: 'PERGAMINO' })).toContain(
      'precioKg',
    );
  });

  it('mojado y pasilla siguen exigiendo precio', async () => {
    expect(await errores({ ...base, tipoCafe: 'MOJADO' })).toContain(
      'precioKg',
    );
    expect(await errores({ ...base, tipoCafe: 'PASILLA' })).toContain(
      'precioKg',
    );
    expect(
      await errores({ ...base, tipoCafe: 'MOJADO', precioKg: 4000 }),
    ).toEqual([]);
  });
});
