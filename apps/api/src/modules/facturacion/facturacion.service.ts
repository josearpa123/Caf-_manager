import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoFactura, Prisma } from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { FacturacionProviderFactory } from './adapters/facturacion-provider.factory';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { QueryFacturasDto } from './dto/query-facturas.dto';
import { AnularFacturaDto } from './dto/anular-factura.dto';

const FACTURA_INCLUDE = {
  puntoCompra: { select: { nombre: true } },
  recepcion: {
    select: {
      codigo: true,
      valorTotal: true,
      proveedor: { select: { nombre: true, numeroIdentificacion: true } },
    },
  },
} as const;

@Injectable()
export class FacturacionService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
    private readonly providerFactory: FacturacionProviderFactory,
  ) {}

  findAll(query: QueryFacturasDto) {
    return this.prisma.factura.findMany({
      where: { puntoCompraId: query.puntoCompraId, estado: query.estado },
      include: FACTURA_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const factura = await this.prisma.factura.findUnique({
      where: { id },
      include: FACTURA_INCLUDE,
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');
    return factura;
  }

  async create(tenantId: string, createdById: string, dto: CreateFacturaDto) {
    const recepcion = await this.prisma.recepcion.findUnique({
      where: { id: dto.recepcionId },
      include: { factura: { select: { id: true } } },
    });
    if (!recepcion)
      throw new BadRequestException('La recepción indicada no existe en este tenant');
    if (recepcion.factura)
      throw new BadRequestException('Esta recepción ya tiene una factura asociada');

    return this.prisma.factura.create({
      data: {
        tenantId,
        puntoCompraId: recepcion.puntoCompraId,
        recepcionId: recepcion.id,
        createdById,
      },
      include: FACTURA_INCLUDE,
    });
  }

  async emitir(id: string) {
    const factura = await this.findOne(id);
    if (factura.estado === EstadoFactura.EMITIDA) {
      throw new BadRequestException('Esta factura ya fue emitida');
    }

    const provider = this.providerFactory.resolve(factura.proveedorTecnologico);
    try {
      const resultado = await provider.emitir(factura);
      return await this.prisma.factura.update({
        where: { id },
        data: {
          estado: EstadoFactura.EMITIDA,
          numero: resultado.numero,
          cufe: resultado.cufe,
          urlPdf: resultado.urlPdf,
          urlXml: resultado.urlXml,
          payloadResponse: resultado.payloadResponse as Prisma.InputJsonValue,
          fechaEmision: new Date(),
        },
        include: FACTURA_INCLUDE,
      });
    } catch (error) {
      await this.prisma.factura.update({
        where: { id },
        data: { estado: EstadoFactura.ERROR },
      });
      throw error;
    }
  }

  async anular(id: string, dto: AnularFacturaDto) {
    const factura = await this.findOne(id);
    if (factura.estado !== EstadoFactura.EMITIDA) {
      throw new BadRequestException('Solo se puede anular una factura ya emitida');
    }
    if (!factura.cufe) {
      throw new BadRequestException('La factura no tiene CUFE registrado');
    }

    const provider = this.providerFactory.resolve(factura.proveedorTecnologico);
    await provider.anular({ ...factura, cufe: factura.cufe }, dto.motivo);

    return this.prisma.factura.update({
      where: { id },
      data: { estado: EstadoFactura.ANULADA, motivoAnulacion: dto.motivo },
      include: FACTURA_INCLUDE,
    });
  }
}
