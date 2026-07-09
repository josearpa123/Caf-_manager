import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Permission } from '@prisma/client';
import { RolesService } from './roles.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermissions(Permission.USUARIOS_VER)
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @RequirePermissions(Permission.USUARIOS_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @RequirePermissions(Permission.ROLES_GESTIONAR)
  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @RequirePermissions(Permission.ROLES_GESTIONAR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @RequirePermissions(Permission.ROLES_GESTIONAR)
  @Patch(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() dto: SetRolePermissionsDto) {
    return this.rolesService.setPermissions(id, dto);
  }

  @RequirePermissions(Permission.ROLES_GESTIONAR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
