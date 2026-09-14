import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { Module } from './entities/module.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Module)
    private readonly moduleRepository: Repository<Module>,
  ) {}

  findAllRoles(): Promise<Role[]> {
    return this.roleRepository.find();
  }

  findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async findPermissionById(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const permissions =
      dto.permissionIds && dto.permissionIds.length > 0
        ? await this.permissionRepository.findBy({ id: In(dto.permissionIds) })
        : [];

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      permissions,
    });
    return this.roleRepository.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findRoleById(id);

    if (dto.name) {
      role.name = dto.name;
    }
    if (dto.description !== undefined) {
      role.description = dto.description ?? null;
    }
    if (dto.permissionIds) {
      role.permissions = await this.permissionRepository.findBy({
        id: In(dto.permissionIds),
      });
    }

    return this.roleRepository.save(role);
  }

  async removeRole(id: string): Promise<void> {
    const result = await this.roleRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Role not found');
    }
  }

  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const permission = this.permissionRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });
    return this.permissionRepository.save(permission);
  }

  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findPermissionById(id);

    if (dto.name) {
      permission.name = dto.name;
    }
    if (dto.description !== undefined) {
      permission.description = dto.description ?? null;
    }

    return this.permissionRepository.save(permission);
  }

  async removePermission(id: string): Promise<void> {
    const result = await this.permissionRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Permission not found');
    }
  }

  findAllModules(): Promise<Module[]> {
    return this.moduleRepository.find();
  }

  async findModuleById(id: string): Promise<Module> {
    const module = await this.moduleRepository.findOne({ where: { id } });
    if (!module) {
      throw new NotFoundException('Module not found');
    }
    return module;
  }

  async createModule(dto: CreateModuleDto): Promise<Module> {
    const module = this.moduleRepository.create({
      name: dto.name,
      pageKey: dto.pageKey,
      description: dto.description ?? null,
    });
    return this.moduleRepository.save(module);
  }

  async updateModule(id: string, dto: UpdateModuleDto): Promise<Module> {
    const module = await this.findModuleById(id);

    if (dto.name) {
      module.name = dto.name;
    }
    if (dto.pageKey) {
      module.pageKey = dto.pageKey;
    }
    if (dto.description !== undefined) {
      module.description = dto.description ?? null;
    }

    return this.moduleRepository.save(module);
  }

  async removeModule(id: string): Promise<void> {
    const result = await this.moduleRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Module not found');
    }
  }

  async assignModulesToRole(
    roleId: string,
    moduleIds: string[],
  ): Promise<void> {
    const role = await this.findRoleById(roleId);
    const modules =
      moduleIds.length > 0
        ? await this.moduleRepository.findBy({ id: In(moduleIds) })
        : [];
    role.modules = modules;
    await this.roleRepository.save(role);
  }
}
