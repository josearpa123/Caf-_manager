import { Injectable } from '@nestjs/common';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { UpsertConfiguracionDto } from './dto/upsert-configuracion.dto';

// Rango de humedad aceptable con el que nace la configuración de un negocio.
const HUMEDAD_MIN_DEFECTO = 10;
const HUMEDAD_MAX_DEFECTO = 12;

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  async get(tenantId: string) {
    return this.prisma.configuracionTenant.findUnique({
      where: { tenantId },
    });
  }

  // Lo único de la configuración que ven todos los usuarios: qué módulos ocultar
  // del menú. Sin configuración guardada no se oculta nada.
  async getMenu(tenantId: string) {
    const config = await this.prisma.configuracionTenant.findUnique({
      where: { tenantId },
      select: { modulosOcultos: true },
    });
    return { modulosOcultos: config?.modulosOcultos ?? [] };
  }

  async upsert(tenantId: string, dto: UpsertConfiguracionDto) {
    return this.prisma.configuracionTenant.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...dto,
        humedadMinAceptable: dto.humedadMinAceptable ?? HUMEDAD_MIN_DEFECTO,
        humedadMaxAceptable: dto.humedadMaxAceptable ?? HUMEDAD_MAX_DEFECTO,
      },
      update: dto,
    });
  }
}
