import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { UsersService } from './users.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions(Permission.USUARIOS_VER)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @RequirePermissions(Permission.USUARIOS_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @RequirePermissions(Permission.USUARIOS_GESTIONAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(tenantId, dto);
  }

  @RequirePermissions(Permission.USUARIOS_GESTIONAR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @RequirePermissions(Permission.USUARIOS_GESTIONAR)
  @Patch(':id/roles')
  assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    return this.usersService.assignRoles(id, dto);
  }
}
