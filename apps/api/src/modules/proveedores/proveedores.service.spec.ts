import { escaparLike, ProveedoresService } from './proveedores.service';

describe('escaparLike', () => {
  it.each([
    ['juan', 'juan'],
    ['100%', '100\\%'],
    ['a_b', 'a\\_b'],
    ['a\\b', 'a\\\\b'],
  ])('%p → %p', (entrada, esperado) => {
    expect(escaparLike(entrada)).toBe(esperado);
  });
});

describe('ProveedoresService.buscar', () => {
  const build = () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ id: 'p1' }]) };
    return { service: new ProveedoresService(prisma as never), prisma };
  };
  // Valores enlazados de la consulta (sin el arreglo de fragmentos SQL).
  const valores = (prisma: { $queryRaw: jest.Mock }): unknown[] =>
    (prisma.$queryRaw.mock.calls[0] as unknown[]).slice(1);

  it('texto vacío o de espacios no consulta la BD', async () => {
    const { service, prisma } = build();
    expect(await service.buscar('t1', { q: '   ' })).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('filtra por el tenant recibido y devuelve las filas', async () => {
    const { service, prisma } = build();
    expect(await service.buscar('t1', { q: 'juan' })).toEqual([{ id: 'p1' }]);
    expect(valores(prisma)[0]).toBe('t1');
  });

  it('escapa los comodines del texto escrito', async () => {
    const { service, prisma } = build();
    await service.buscar('t1', { q: '10%_' });
    expect(valores(prisma)).toContain('%10\\%\\_%');
    expect(valores(prisma)).toContain('10\\%\\_%');
  });

  it('limita a 10 por defecto y nunca más de 20', async () => {
    const a = build();
    await a.service.buscar('t1', { q: 'juan' });
    expect(valores(a.prisma).at(-1)).toBe(10);
    const b = build();
    await b.service.buscar('t1', { q: 'juan', limit: 500 });
    expect(valores(b.prisma).at(-1)).toBe(20);
    const c = build();
    await c.service.buscar('t1', { q: 'juan', limit: 3 });
    expect(valores(c.prisma).at(-1)).toBe(3);
  });
});
