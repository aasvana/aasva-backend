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
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Role } from './enums/role.enum';

@Controller('modules')
@Roles(Role.ADMIN)
export class ModulesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles:read')
  findAllModules() {
    return this.rolesService.findAllModules();
  }

  @Get(':id')
  @Permissions('roles:read')
  findModule(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findModuleById(id);
  }

  @Post()
  @Permissions('roles:create')
  createModule(@Body() dto: CreateModuleDto) {
    return this.rolesService.createModule(dto);
  }

  @Patch(':id')
  @Permissions('roles:update')
  updateModule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.rolesService.updateModule(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('roles:delete')
  async removeModule(@Param('id', ParseUUIDPipe) id: string) {
    await this.rolesService.removeModule(id);
  }

  @Post('roles/:roleId/modules')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('roles:update')
  async assignModulesToRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body('moduleIds') moduleIds: string[],
  ) {
    await this.rolesService.assignModulesToRole(roleId, moduleIds);
  }
}
