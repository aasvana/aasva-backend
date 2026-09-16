import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserDetail } from './entities/user-detail.entity';
import { Role } from '../roles/entities/role.entity';
import { ProfileType } from './entities/profile-type.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { UpdateUserSubscriptionDto } from './dto/update-user-subscription.dto';
import { TenantsService } from '../tenants/tenants.service';
import { PlansService } from '../tenants/plans.service';
import type {
  SubscriptionStatus,
  TenantSubscription,
} from '../tenants/tenants.constants';

const BCRYPT_ROUNDS = 12;

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

export function isPlatformAdmin(roles: string[]): boolean {
  return roles.includes('systemadmin') || roles.includes('superadmin');
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(ProfileType)
    private readonly profileTypeRepository: Repository<ProfileType>,
    @InjectRepository(UserDetail)
    private readonly userDetailRepository: Repository<UserDetail>,
    private readonly tenantsService: TenantsService,
    private readonly plansService: PlansService,
  ) {}

  private buildUserQuery(tenantId: string, platformAdmin: boolean) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .leftJoinAndSelect('roles.modules', 'modules')
      .leftJoinAndSelect('user.detail', 'detail');
    if (platformAdmin) {
      qb.leftJoinAndSelect('user.tenant', 'tenant');
    } else {
      qb.where('user.tenantId = :tenantId', { tenantId });
    }
    return qb;
  }

  findAll(
    query: FindUsersQueryDto,
    tenantId: string,
    roles: string[] = [],
  ): Promise<PaginatedUsers> {
    const { page, limit, search } = query;
    const platformAdmin = isPlatformAdmin(roles);

    const qb = this.buildUserQuery(tenantId, platformAdmin);

    if (search) {
      qb.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    return qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
      .then(([items, total]) => ({ items, total, page, limit }));
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .leftJoinAndSelect('roles.modules', 'modules')
      .leftJoinAndSelect('user.detail', 'detail')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByIdScoped(
    id: string,
    tenantId: string,
    roles: string[] = [],
  ): Promise<User> {
    const platformAdmin = isPlatformAdmin(roles);
    const user = await this.buildUserQuery(tenantId, platformAdmin)
      .andWhere('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithSensitiveFields(email: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.refreshTokenHash')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .leftJoinAndSelect('roles.modules', 'modules')
      .leftJoinAndSelect('user.detail', 'detail')
      .leftJoinAndSelect(
        'ProfileType',
        'profileType',
        "profileType.id = (detail.details->>'profileTypeId')::uuid",
      )
      .where('user.email = :email', { email })
      .getOne();

    return user;
  }

  async create(dto: CreateUserDto, tenantId: string): Promise<User> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const roles =
      dto.roleIds && dto.roleIds.length > 0
        ? await this.roleRepository.findBy({ id: In(dto.roleIds) })
        : [];

    const isSysOrSuperAdmin = roles.some(
      (r) => r.name === 'systemadmin' || r.name === 'superadmin',
    );

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
      tenantId,
      isActive: dto.isActive ?? true,
      isApproved: dto.isApproved ?? isSysOrSuperAdmin ?? false,
      roles,
    });

    const savedUser = await this.userRepository.save(user);

    const details: Record<string, unknown> = {};
    if (dto.profileTypeId) {
      details.profileTypeId = dto.profileTypeId;
    }

    await this.userDetailRepository.save(
      this.userDetailRepository.create({
        userId: savedUser.id,
        details: Object.keys(details).length > 0 ? details : {},
      }),
    );

    return savedUser;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    tenantId: string,
    roles: string[] = [],
  ): Promise<User> {
    const user = await this.findByIdScoped(id, tenantId, roles);

    if (dto.email) {
      user.email = dto.email.toLowerCase();
    }
    if (dto.firstName) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName) {
      user.lastName = dto.lastName;
    }
    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }
    if (dto.isApproved !== undefined) {
      user.isApproved = dto.isApproved;
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }
    if (dto.roleIds) {
      const isSystemAdmin = user.roles.some(
        (role) => role.name === 'systemadmin',
      );
      if (isSystemAdmin) {
        throw new ForbiddenException(
          'Systemadmin users cannot have their roles changed',
        );
      }
      user.roles = await this.roleRepository.findBy({ id: In(dto.roleIds) });
    }
    if (dto.profileTypeId !== undefined) {
      const existingDetail = await this.userDetailRepository.findOne({
        where: { userId: id },
      });

      const nextDetails = existingDetail?.details
        ? { ...existingDetail.details }
        : {};

      if (dto.profileTypeId) {
        nextDetails.profileTypeId = dto.profileTypeId;
      } else {
        delete nextDetails.profileTypeId;
      }

      if (existingDetail) {
        existingDetail.details = nextDetails;
        await this.userDetailRepository.save(existingDetail);
      } else {
        await this.userDetailRepository.save(
          this.userDetailRepository.create({
            userId: id,
            details: nextDetails,
          }),
        );
      }
    }

    const savedUser = await this.userRepository.save(user);

    if (dto.detail) {
      const existingDetail = await this.userDetailRepository.findOne({
        where: { userId: id },
      });

      if (existingDetail) {
        await this.userDetailRepository.update(id, dto.detail);
      } else {
        await this.userDetailRepository.save(
          this.userDetailRepository.create({
            userId: id,
            ...dto.detail,
          }),
        );
      }
    }

    return savedUser;
  }

  async remove(
    id: string,
    tenantId: string,
    roles: string[] = [],
  ): Promise<void> {
    const user = await this.findByIdScoped(id, tenantId, roles);
    const isProtected = user.roles.some(
      (role) => role.name === 'superadmin' || role.name === 'systemadmin',
    );
    if (isProtected) {
      throw new ForbiddenException(
        'Superadmin and systemadmin users cannot be deleted',
      );
    }
    const platformAdmin = isPlatformAdmin(roles);
    const result = platformAdmin
      ? await this.userRepository.delete(id)
      : await this.userRepository.delete({ id, tenantId });
    if (!result.affected) {
      throw new NotFoundException('User not found');
    }
  }

  async assignDefaultRole(user: User): Promise<User> {
    const role = await this.roleRepository.findOne({
      where: { name: 'user' },
    });
    if (role) {
      user.roles = [role];
      await this.userRepository.save(user);
    }
    return user;
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      passwordHash,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  }

  async setRefreshToken(
    userId: string,
    refreshTokenHash: string | null,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      refreshTokenHash,
      refreshTokenExpiresAt: expiresAt,
    });
  }

  async findByIdWithSensitiveFields(id: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.refreshTokenHash')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .leftJoinAndSelect('roles.modules', 'modules')
      .leftJoinAndSelect('user.detail', 'detail')
      .leftJoinAndSelect(
        'ProfileType',
        'profileType',
        "profileType.id = (detail.details->>'profileTypeId')::uuid",
      )
      .where('user.id = :id', { id })
      .getOne();
    return user ?? null;
  }

  async findByRefreshTokenHash(hash: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .leftJoinAndSelect('roles.modules', 'modules')
      .leftJoinAndSelect('user.detail', 'detail')
      .leftJoinAndSelect(
        'ProfileType',
        'profileType',
        "profileType.id = (detail.details->>'profileTypeId')::uuid",
      )
      .where('user.refreshTokenHash = :hash', { hash })
      .getOne();
    return user ?? null;
  }

  async verifyRefreshToken(
    userId: string,
    refreshTokenHash: string,
  ): Promise<boolean> {
    const user = await this.findByIdWithSensitiveFields(userId);
    if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      return false;
    }

    const isMatch = user.refreshTokenHash === refreshTokenHash;
    const isExpired = user.refreshTokenExpiresAt.getTime() < Date.now();
    return isMatch && !isExpired;
  }

  findAllProfileTypes(): Promise<ProfileType[]> {
    return this.profileTypeRepository.find();
  }

  async findProfileTypeById(id: string): Promise<ProfileType> {
    const profileType = await this.profileTypeRepository.findOne({
      where: { id },
    });
    if (!profileType) {
      throw new NotFoundException('Profile type not found');
    }
    return profileType;
  }

  async updateProfileType(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<ProfileType> {
    const profileType = await this.profileTypeRepository.findOne({
      where: { id },
    });
    if (!profileType) {
      throw new NotFoundException('Profile type not found');
    }
    Object.assign(profileType, patch);
    return this.profileTypeRepository.save(profileType);
  }

  async findUserDetailByUserId(
    userId: string,
    tenantId: string,
    roles: string[] = [],
  ): Promise<UserDetail> {
    await this.findByIdScoped(userId, tenantId, roles);
    const detail = await this.userDetailRepository.findOne({
      where: { userId },
    });
    if (!detail) {
      throw new NotFoundException('User details not found');
    }
    return detail;
  }

  async updateUserDetail(
    userId: string,
    patch: Partial<UserDetail>,
    tenantId: string,
    roles: string[] = [],
  ): Promise<UserDetail> {
    await this.findByIdScoped(userId, tenantId, roles);
    const detail = await this.userDetailRepository.findOne({
      where: { userId },
    });

    if (!detail) {
      return this.userDetailRepository.save(
        this.userDetailRepository.create({
          userId,
          ...patch,
        }),
      );
    }

    const nextDetails = patch.details
      ? {
          ...(detail.details ?? {}),
          ...patch.details,
        }
      : detail.details;

    Object.assign(detail, patch, { details: nextDetails });
    return this.userDetailRepository.save(detail);
  }

  async updateUserModules(
    userId: string,
    moduleOverrides: { add: string[]; remove: string[] },
    tenantId: string,
    roles: string[] = [],
  ): Promise<UserDetail> {
    return this.updateUserDetail(
      userId,
      {
        details: {
          moduleOverrides,
        },
      },
      tenantId,
      roles,
    );
  }

  async setUserSubscription(
    id: string,
    tenantId: string,
    roles: string[],
    dto: UpdateUserSubscriptionDto,
  ): Promise<TenantSubscription> {
    const user = await this.findByIdScoped(id, tenantId, roles);
    const status = dto.status as SubscriptionStatus;

    let plan: string | null = null;
    if (dto.plan !== undefined) {
      plan = dto.plan;
    } else if (status === 'active') {
      plan = 'monthly';
    }

    const planRow = plan ? await this.plansService.findByKey(plan) : null;
    const durationDays = planRow
      ? planRow.durationDays
      : status === 'trial'
        ? 90
        : 30;

    let paidUntil: Date | null = null;
    if (dto.paidUntil) {
      paidUntil = new Date(dto.paidUntil);
    } else if (status === 'active' && durationDays) {
      paidUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    } else if (status === 'trial') {
      const trialDays = durationDays ?? 90;
      paidUntil = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    }

    return this.tenantsService.setSubscription(user.tenantId, {
      status,
      plan,
      paidUntil,
    });
  }

  async updateUserSubModules(
    userId: string,
    moduleName: string,
    subModules: string[],
    tenantId: string,
    roles: string[] = [],
  ): Promise<UserDetail> {
    await this.findByIdScoped(userId, tenantId, roles);
    const detail = await this.userDetailRepository.findOne({
      where: { userId },
    });

    const currentDetails = detail?.details ? { ...detail.details } : {};
    const currentSubModules =
      (currentDetails.subModules as Record<string, string[]>) ?? {};
    currentDetails.subModules = {
      ...currentSubModules,
      [moduleName]: subModules,
    };

    if (detail) {
      detail.details = currentDetails;
      return this.userDetailRepository.save(detail);
    }

    return this.userDetailRepository.save(
      this.userDetailRepository.create({
        userId,
        details: currentDetails,
      }),
    );
  }

  async deleteUserDetail(userId: string): Promise<void> {
    const result = await this.userDetailRepository.delete(userId);
    if (!result.affected) {
      throw new NotFoundException('User details not found');
    }
  }
}
