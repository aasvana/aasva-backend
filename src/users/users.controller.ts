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
import { UpdateUserSubscriptionDto } from './dto/update-user-subscription.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Role } from '../roles/enums/role.enum';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get()
  @Permissions('users:read')
  findAll(
    @CurrentUser() currentUser: JwtUser,
    @Query() query: FindUsersQueryDto,
  ) {
    return this.usersService.findAll(
      query,
      this.tenantContext.require(),
      currentUser.roles,
    );
  }

  @Get(':id')
  @Permissions('users:read')
  findOne(
    @CurrentUser() currentUser: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findByIdScoped(
      id,
      this.tenantContext.require(),
      currentUser.roles,
    );
  }

  @Post()
  @Permissions('users:create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto, this.tenantContext.require());
  }

  @Patch(':id')
  @Permissions('users:update')
  update(
    @CurrentUser() currentUser: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(
      id,
      dto,
      this.tenantContext.require(),
      currentUser.roles,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('users:delete')
  async remove(
    @CurrentUser() currentUser: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.usersService.remove(
      id,
      this.tenantContext.require(),
      currentUser.roles,
    );
  }

  @Patch(':id/subscription')
  @Permissions('users:update')
  updateSubscription(
    @CurrentUser() currentUser: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserSubscriptionDto,
  ) {
    return this.usersService.setUserSubscription(
      id,
      this.tenantContext.require(),
      currentUser.roles,
      dto,
    );
  }

  @Patch(':id/modules')
  @Permissions('users:update')
  async updateModules(
    @CurrentUser() currentUser: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { add: string[]; remove: string[] },
  ) {
    return this.usersService.updateUserModules(
      id,
      body,
      this.tenantContext.require(),
      currentUser.roles,
    );
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
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get(':userId')
  @Permissions('users:read')
  findOne(
    @CurrentUser() currentUser: JwtUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.usersService.findUserDetailByUserId(
      userId,
      this.tenantContext.require(),
      currentUser.roles,
    );
  }

  @Patch(':userId')
  @Permissions('users:update')
  update(
    @CurrentUser() currentUser: JwtUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() patch: Record<string, unknown>,
  ) {
    return this.usersService.updateUserDetail(
      userId,
      patch,
      this.tenantContext.require(),
      currentUser.roles,
    );
  }
}
