/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { ConfiguracionService } from './configuracion.service';

function build() {
  const prisma = {
    configuracionTenant: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
  return { service: new ConfiguracionService(prisma as never), prisma };
}

describe('ConfiguracionService', () => {
  describe('getMenu', () => {
    it('sin configuración guardada no oculta nada', async () => {
      const { service } = build();
      expect(await service.getMenu('t1')).toEqual({ modulosOcultos: [] });
    });

    it('devuelve los módulos que el negocio ocultó', async () => {
      const { service, prisma } = build();
      prisma.configuracionTenant.findUnique.mockResolvedValue({
        modulosOcultos: ['CORTES', 'PRESTAMOS'],
      });
      expect(await service.getMenu('t1')).toEqual({
        modulosOcultos: ['CORTES', 'PRESTAMOS'],
      });
    });
  });

  describe('upsert', () => {
    it('la primera vez crea con humedad 10-12 si solo se envía otra opción', async () => {
      const { service, prisma } = build();
      await service.upsert('t1', { modulosOcultos: ['CORTES'] });
      const llamada = prisma.configuracionTenant.upsert.mock.calls[0][0];
      expect(llamada.create).toMatchObject({
        tenantId: 't1',
        humedadMinAceptable: 10,
        humedadMaxAceptable: 12,
        modulosOcultos: ['CORTES'],
      });
    });

    it('al actualizar solo toca lo que se envió', async () => {
      const { service, prisma } = build();
      await service.upsert('t1', { modulosOcultos: [] });
      expect(prisma.configuracionTenant.upsert.mock.calls[0][0].update).toEqual(
        {
          modulosOcultos: [],
        },
      );
    });

    it('respeta el rango de humedad si se envía', async () => {
      const { service, prisma } = build();
      await service.upsert('t1', {
        humedadMinAceptable: 9,
        humedadMaxAceptable: 13,
      });
      expect(
        prisma.configuracionTenant.upsert.mock.calls[0][0].create,
      ).toMatchObject({ humedadMinAceptable: 9, humedadMaxAceptable: 13 });
    });
  });
});
