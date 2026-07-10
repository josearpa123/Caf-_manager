import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { CompradoresService } from './compradores.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCompradorDto } from './dto/create-comprador.dto';
import { UpdateCompradorDto } from './dto/update-comprador.dto';

@Controller('compradores')
export class CompradoresController {
  constructor(private readonly compradoresService: CompradoresService) {}

  @RequirePermissions(Permission.VENTAS_VER)
  @Get()
  findAll() {
    return this.compradoresService.findAll();
  }

  @RequirePermissions(Permission.VENTAS_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.compradoresService.findOne(id);
  }

  @RequirePermissions(Permission.VENTAS_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateCompradorDto,
  ) {
    return this.compradoresService.create(tenantId, dto);
  }

  @RequirePermissions(Permission.VENTAS_EDITAR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompradorDto) {
    return this.compradoresService.update(id, dto);
  }
}
