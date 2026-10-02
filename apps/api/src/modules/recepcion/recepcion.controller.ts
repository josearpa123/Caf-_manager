import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Modulo, Permission } from '@prisma/client';
import { RecepcionService } from './recepcion.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModulo } from '../../common/decorators/require-modulo.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';
import { validarLlave } from '../../prisma/idempotencia';
import { QueryRecepcionesDto } from './dto/query-recepciones.dto';
import { QueryRetencionDto } from './dto/query-retencion.dto';

@Controller('recepcion')
@RequireModulo(Modulo.RECEPCION)
export class RecepcionController {
  constructor(private readonly recepcionService: RecepcionService) {}

  @RequirePermissions(Permission.RECEPCION_VER)
  @Get()
  findAll(@Query() query: QueryRecepcionesDto) {
    return this.recepcionService.findAll(query);
  }

  // Todo lo que la pantalla de recepción rápida necesita al abrir, para que el
  // operador no requiera permisos de configuración ni de puntos de compra.
  // Antes de ':id' para que 'contexto' no se tome como un id.
  @RequirePermissions(Permission.RECEPCION_CREAR)
  @Get('contexto')
  contexto(@CurrentUser('puntoCompraId') puntoCompraId: string | null) {
    return this.recepcionService.contexto(puntoCompraId);
  }

  // Vista previa de la retención con la misma regla del guardado.
  @RequirePermissions(Permission.RECEPCION_CREAR)
  @Get('retencion')
  retencion(@Query() query: QueryRetencionDto) {
    return this.recepcionService.previsualizarRetencion(
      query.tipoCafe,
      query.valorTotal,
    );
  }

  @RequirePermissions(Permission.RECEPCION_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recepcionService.findOne(id);
  }

  @RequirePermissions(Permission.RECEPCION_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRecepcionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.recepcionService.create(
      tenantId,
      userId,
      dto,
      validarLlave(idempotencyKey),
    );
  }
}
