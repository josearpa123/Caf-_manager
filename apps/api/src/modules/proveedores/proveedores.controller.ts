import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Modulo, Permission } from '@prisma/client';
import { ProveedoresService } from './proveedores.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModulo } from '../../common/decorators/require-modulo.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { QueryProveedoresDto } from './dto/query-proveedores.dto';
import { BuscarProveedoresDto } from './dto/buscar-proveedores.dto';

@Controller('proveedores')
@RequireModulo(Modulo.PROVEEDORES)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @RequirePermissions(Permission.PROVEEDORES_VER)
  @Get()
  findAll(@Query() query: QueryProveedoresDto) {
    return this.proveedoresService.findAll(query);
  }

  // Antes de ':id' para que 'buscar' no se tome como un id.
  @RequirePermissions(Permission.PROVEEDORES_VER)
  @Get('buscar')
  buscar(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: BuscarProveedoresDto,
  ) {
    return this.proveedoresService.buscar(tenantId, query);
  }

  @RequirePermissions(Permission.PROVEEDORES_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(id);
  }

  @RequirePermissions(Permission.PROVEEDORES_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateProveedorDto,
  ) {
    return this.proveedoresService.create(tenantId, userId, dto);
  }

  @RequirePermissions(Permission.PROVEEDORES_EDITAR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProveedorDto) {
    return this.proveedoresService.update(id, dto);
  }

  @RequirePermissions(Permission.PROVEEDORES_ELIMINAR)
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.proveedoresService.setActivo(id, false);
  }

  @RequirePermissions(Permission.PROVEEDORES_EDITAR)
  @Patch(':id/reactivar')
  reactivate(@Param('id') id: string) {
    return this.proveedoresService.setActivo(id, true);
  }
}
