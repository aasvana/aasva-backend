import { Module as NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Module } from './entities/module.entity';
import { RolesService } from './roles.service';
import { PermissionsController, RolesController } from './roles.controller';
import { ModulesController } from './modules.controller';

@NestModule({
  imports: [TypeOrmModule.forFeature([Role, Permission, Module])],
  controllers: [RolesController, PermissionsController, ModulesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
