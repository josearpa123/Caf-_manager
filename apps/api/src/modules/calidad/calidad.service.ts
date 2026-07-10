import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CalidadService {
  // DefectoTipo es un catálogo global (no tenant-scoped), por eso usa
  // PrismaService directo en vez de InjectTenantPrisma().
  constructor(private readonly prisma: PrismaService) {}

  findDefectosTipo() {
    return this.prisma.defectoTipo.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });
  }
}
