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
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Role } from '../roles/enums/role.enum';

@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  findAll(@Query() query: FindUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Permissions('users:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Permissions('users:create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Permissions('users:update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('users:delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }

  @Patch(':id/modules')
  @Permissions('users:update')
  async updateModules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { add: string[]; remove: string[] },
  ) {
    return this.usersService.updateUserModules(id, body);
  }
}

@Controller('profile-types')
@Roles(Role.ADMIN)
export class ProfileTypesController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  findAllProfileTypes() {
    return this.usersService.findAllProfileTypes();
  }

  @Get(':id')
  @Permissions('users:read')
  findOneProfileType(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findProfileTypeById(id);
  }

  @Patch(':id')
  @Permissions('users:update')
  updateProfileType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() patch: Record<string, unknown>,
  ) {
    return this.usersService.updateProfileType(id, patch);
  }
}

@Controller('user-details')
@Roles(Role.ADMIN)
export class UserDetailsController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':userId')
  @Permissions('users:read')
  findOne(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.findUserDetailByUserId(userId);
  }

  @Patch(':userId')
  @Permissions('users:update')
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() patch: Record<string, unknown>,
  ) {
    return this.usersService.updateUserDetail(userId, patch);
  }
}
