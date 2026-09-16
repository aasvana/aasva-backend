import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ProfileType } from './entities/profile-type.entity';
import { UserDetail } from './entities/user-detail.entity';
import { Role } from '../roles/entities/role.entity';
import { UsersService } from './users.service';
import {
  UsersController,
  ProfileTypesController,
  UserDetailsController,
} from './users.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ProfileType, UserDetail, Role]),
    TenantsModule,
  ],
  controllers: [UsersController, ProfileTypesController, UserDetailsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
