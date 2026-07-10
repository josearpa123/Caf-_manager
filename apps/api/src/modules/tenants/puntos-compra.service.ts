import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreatePuntoCompraDto } from './dto/create-punto-compra.dto';
import { UpdatePuntoCompraDto } from './dto/update-punto-compra.dto';

@Injectable()
export class PuntosCompraService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  findAll() {
    return this.prisma.puntoCompra.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const punto = await this.prisma.puntoCompra.findUnique({ where: { id } });
    if (!punto) throw new NotFoundException('Punto de compra no encontrado');
    return punto;
  }

  private async assertLimitePlanNoSuperado() {
    const tenant = await this.prisma.tenant.findFirst({
      include: { plan: true, _count: { select: { puntosCompra: true } } },
    });
    const maxPuntosCompra = tenant?.plan?.maxPuntosCompra;
    if (maxPuntosCompra != null && tenant!._count.puntosCompra >= maxPuntosCompra) {
      throw new BadRequestException(
        `Se alcanzó el límite de puntos de compra del plan actual (${maxPuntosCompra}). Contacte al administrador para ampliarlo.`,
      );
    }
  }

  async create(tenantId: string, dto: CreatePuntoCompraDto) {
    await this.assertLimitePlanNoSuperado();
    return this.prisma.puntoCompra.create({ data: { tenantId, ...dto } });
  }

  async update(id: string, dto: UpdatePuntoCompraDto) {
    await this.findOne(id);
    return this.prisma.puntoCompra.update({ where: { id }, data: dto });
  }
}
