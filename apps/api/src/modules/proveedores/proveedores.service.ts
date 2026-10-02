import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { QueryProveedoresDto } from './dto/query-proveedores.dto';
import {
  BuscarProveedoresDto,
  LIMITE_BUSQUEDA_DEFECTO,
  LIMITE_BUSQUEDA_MAX,
} from './dto/buscar-proveedores.dto';

export interface ProveedorCoincidencia {
  id: string;
  nombre: string;
  apodo: string | null;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  telefono: string | null;
  municipio: string | null;
  // Tipo de café de su última recepción: la pantalla lo usa de valor por defecto.
  ultimoTipoCafe: string | null;
}

// Escapa los comodines de LIKE para que '_' o '%' escritos por el usuario se
// busquen literalmente.
export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  findAll(query: QueryProveedoresDto) {
    const where: Prisma.ProveedorWhereInput = {};
    if (query.activo !== undefined) where.activo = query.activo;
    if (query.municipio) where.municipio = query.municipio;
    if (query.q) {
      where.OR = [
        { nombre: { contains: query.q, mode: 'insensitive' } },
        { apodo: { contains: query.q, mode: 'insensitive' } },
        { numeroIdentificacion: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.proveedor.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
  }

  // Búsqueda mientras se escribe (RF-02, p95 < 300 ms): cédula, nombre o apodo,
  // parcial o con errores de digitación, los más parecidos primero. Es un top-N
  // acotado (no un listado), por eso no lleva cursor. Solo proveedores activos
  // del tenant. Ignora tildes y mayúsculas (unaccent + pg_trgm); SQL explícito con
  // el tenantId del JWT, nunca del cliente.
  async buscar(
    tenantId: string,
    query: BuscarProveedoresDto,
  ): Promise<ProveedorCoincidencia[]> {
    const q = query.q.trim();
    if (!q) return [];
    const limit = Math.min(
      query.limit ?? LIMITE_BUSQUEDA_DEFECTO,
      LIMITE_BUSQUEDA_MAX,
    );
    const contiene = `%${escaparLike(q)}%`;
    const empieza = `${escaparLike(q)}%`;
    return this.prisma.$queryRaw<ProveedorCoincidencia[]>`
      SELECT p."id", p."nombre", p."apodo", p."tipoIdentificacion"::text AS "tipoIdentificacion",
             p."numeroIdentificacion", p."telefono", p."municipio",
             (SELECT r."tipoCafe"::text FROM "Recepcion" r
               WHERE r."tenantId" = p."tenantId" AND r."proveedorId" = p."id"
               ORDER BY r."fecha" DESC LIMIT 1) AS "ultimoTipoCafe"
      FROM "Proveedor" p
      WHERE p."tenantId" = ${tenantId} AND p."activo" = true
        AND (unaccent(p."nombre") ILIKE unaccent(${contiene})
             OR unaccent(coalesce(p."apodo", '')) ILIKE unaccent(${contiene})
             OR p."numeroIdentificacion" ILIKE ${contiene}
             OR unaccent(p."nombre") % unaccent(${q})
             OR unaccent(coalesce(p."apodo", '')) % unaccent(${q}))
      ORDER BY (CASE WHEN p."numeroIdentificacion" ILIKE ${empieza} THEN 0 ELSE 1 END),
               GREATEST(
                 similarity(unaccent(p."nombre"), unaccent(${q})),
                 similarity(unaccent(coalesce(p."apodo", '')), unaccent(${q}))
               ) DESC,
               p."nombre"
      LIMIT ${limit}`;
  }

  async findOne(id: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async create(tenantId: string, createdById: string, dto: CreateProveedorDto) {
    try {
      return await this.prisma.proveedor.create({
        data: { tenantId, createdById, ...dto },
      });
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async update(id: string, dto: UpdateProveedorDto) {
    await this.findOne(id);
    try {
      return await this.prisma.proveedor.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async setActivo(id: string, activo: boolean) {
    await this.findOne(id);
    return this.prisma.proveedor.update({ where: { id }, data: { activo } });
  }

  private translateUniqueConstraintError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        'Ya existe un proveedor con ese tipo y número de identificación',
      );
    }
    return error;
  }
}
