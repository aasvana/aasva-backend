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

const BCRYPT_ROUNDS = 12;

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  limit: number;
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
  ) {}

  findAll(query: FindUsersQueryDto): Promise<PaginatedUsers> {
    const { page, limit, search } = query;

    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .leftJoinAndSelect('roles.modules', 'modules')
      .leftJoinAndSelect('user.detail', 'detail')
      .where(
        search
          ? '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)'
          : '1=1',
        search ? { search: `%${search}%` } : undefined,
      )
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

  async create(dto: CreateUserDto): Promise<User> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const roles =
      dto.roleIds && dto.roleIds.length > 0
        ? await this.roleRepository.findBy({ id: In(dto.roleIds) })
        : [];

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
      isActive: dto.isActive ?? true,
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

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

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

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    const isProtected = user.roles.some(
      (role) => role.name === 'superadmin' || role.name === 'systemadmin',
    );
    if (isProtected) {
      throw new ForbiddenException(
        'Superadmin and systemadmin users cannot be deleted',
      );
    }
    const result = await this.userRepository.delete(id);
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

  async findUserDetailByUserId(userId: string): Promise<UserDetail> {
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
  ): Promise<UserDetail> {
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

    Object.assign(detail, patch);
    return this.userDetailRepository.save(detail);
  }

  async updateUserModules(
    userId: string,
    moduleOverrides: { add: string[]; remove: string[] },
  ): Promise<UserDetail> {
    return this.updateUserDetail(userId, {
      details: {
        moduleOverrides,
      },
    });
  }

  async deleteUserDetail(userId: string): Promise<void> {
    const result = await this.userDetailRepository.delete(userId);
    if (!result.affected) {
      throw new NotFoundException('User details not found');
    }
  }
}
