import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Role } from './enums/role.enum';

@Controller('roles')
@Roles(Role.ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles:read')
  findAllRoles() {
    return this.rolesService.findAllRoles();
  }

  @Get(':id')
  @Permissions('roles:read')
  findRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findRoleById(id);
  }

  @Post()
  @Permissions('roles:create')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Patch(':id')
  @Permissions('roles:update')
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('roles:delete')
  async removeRole(@Param('id', ParseUUIDPipe) id: string) {
    await this.rolesService.removeRole(id);
  }
}

@Controller('permissions')
@Roles(Role.ADMIN)
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('permissions:read')
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get(':id')
  @Permissions('permissions:read')
  findPermission(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findPermissionById(id);
  }

  @Post()
  @Permissions('permissions:create')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rolesService.createPermission(dto);
  }

  @Patch(':id')
  @Permissions('permissions:update')
  updatePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.rolesService.updatePermission(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('permissions:delete')
  async removePermission(@Param('id', ParseUUIDPipe) id: string) {
    await this.rolesService.removePermission(id);
  }
}
