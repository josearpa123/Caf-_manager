import { Injectable } from '@nestjs/common';
import { AccionAuditoria, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogParams {
  tenantId: string;
  userId: string | null;
  entidad: string;
  entidadId: string;
  accion: AccionAuditoria;
  datosAnteriores?: unknown;
  datosNuevos?: unknown;
  ipAddress?: string;
}

// Fallback explícito para operaciones que la audit-log.extension.ts automática
// NO cubre: operaciones compuestas de negocio, o updateMany/deleteMany sobre
// modelos auditados (donde no hay un único entidadId resultante).
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        entidad: params.entidad,
        entidadId: params.entidadId,
        accion: params.accion,
        datosAnteriores: params.datosAnteriores as Prisma.InputJsonValue,
        datosNuevos: params.datosNuevos as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
      },
    });
  }
}
