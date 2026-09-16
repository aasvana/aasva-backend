import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CompanySetting } from '../company/entities/company-setting.entity';
import { User } from '../users/entities/user.entity';
import { UserDetail } from '../users/entities/user-detail.entity';
import { ProfileType } from '../users/entities/profile-type.entity';
import { TenantsService } from '../tenants/tenants.service';
import type { TenantSubscription } from '../tenants/tenants.constants';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { OAuthIdentity } from './entities/oauth-identity.entity';
import { MailService } from '../mail/mail.service';
import { AppConfigService } from '../config/app-config.service';
import { parseDuration } from '../common/utils/duration.util';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import type { GoogleOAuthUser } from './strategies/google.strategy';
import type { StringValue } from 'ms';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
  subscription: TenantSubscription;
}

export type SafeUser = Omit<
  User,
  | 'passwordHash'
  | 'refreshTokenHash'
  | 'refreshTokenExpiresAt'
  | 'oauthIdentities'
  | 'tenant'
> & {
  detail: UserDetail | null;
  modules: string[];
  companyComplete: boolean;
  profileType: Pick<ProfileType, 'id' | 'name' | 'key'> | null;
  assignedRole: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(OAuthIdentity)
    private readonly oauthIdentityRepository: Repository<OAuthIdentity>,
    @InjectRepository(CompanySetting)
    private readonly companyRepository: Repository<CompanySetting>,
    @InjectRepository(ProfileType)
    private readonly profileTypeRepository: Repository<ProfileType>,
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: AppConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase();

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const tenantName =
      dto.tenantName?.trim() || `${dto.firstName} ${dto.lastName} Company`;
    const tenant = await this.tenantsService.create(tenantName);

    const user = await this.usersService.create({ ...dto, email }, tenant.id);
    await this.usersService.assignDefaultRole(user);
    const fresh = await this.usersService.findById(user.id);

    return this.issueTokens(fresh);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithSensitiveFields(
      dto.email.toLowerCase(),
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash!,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const tokenHash = this.hashToken(refreshToken);
    const user = await this.usersService.findByRefreshTokenHash(tokenHash);

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const expiresAt = user.refreshTokenExpiresAt;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    return this.issueTokens(user);
  }

  async logout(user: JwtUser): Promise<void> {
    await this.usersService.setRefreshToken(user.id, null, null);
  }

  async changePassword(user: JwtUser, dto: ChangePasswordDto): Promise<void> {
    const entity = await this.usersService.findByIdWithSensitiveFields(user.id);
    if (!entity) {
      throw new NotFoundException('User not found');
    }

    const currentValid = await bcrypt.compare(
      dto.currentPassword,
      entity.passwordHash!,
    );
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usersService.updatePasswordHash(user.id, newPasswordHash);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    if (!user) {
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    await this.passwordResetTokenRepository.insert({
      userId: user.id,
      tokenHash: this.hashToken(rawToken),
      expiresAt,
    });

    const resetUrl = `${this.config.appBaseUrl}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);
    const record = await this.passwordResetTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    if (record.usedAt) {
      throw new BadRequestException('Reset token has already been used');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.usersService.updatePasswordHash(record.userId, passwordHash);

    await this.passwordResetTokenRepository.update(
      { userId: record.userId, usedAt: IsNull() },
      { usedAt: new Date() },
    );
  }

  async me(
    userId: string,
  ): Promise<{ user: SafeUser; subscription: TenantSubscription }> {
    const user = await this.usersService.findById(userId);
    const profileType = await this.getProfileType(user);
    return {
      user: await this.toSafeUser(user, profileType),
      subscription: await this.subscriptionFor(user),
    };
  }

  async loginWithOAuth(profile: GoogleOAuthUser): Promise<AuthResult> {
    const { provider, providerId, email, emailVerified, firstName, lastName } =
      profile;

    const existingIdentity = await this.oauthIdentityRepository.findOne({
      where: { provider, providerUserId: providerId },
    });

    if (existingIdentity) {
      const user = await this.usersService.findById(existingIdentity.userId);
      return this.issueTokens(user);
    }

    if (!emailVerified) {
      throw new UnauthorizedException(
        'Your Google email is not verified. Please verify and try again.',
      );
    }

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      await this.oauthIdentityRepository.save({
        userId: existingUser.id,
        provider,
        providerUserId: providerId,
        email,
        emailVerified,
      });
      return this.issueTokens(existingUser);
    }

    const tenant = await this.tenantsService.create(
      `${firstName} ${lastName} Company`,
    );
    const newUser = await this.usersService.create(
      {
        firstName,
        lastName,
        email,
        password: randomBytes(32).toString('hex'),
      },
      tenant.id,
    );
    await this.usersService.assignDefaultRole(newUser);

    await this.oauthIdentityRepository.save({
      userId: newUser.id,
      provider,
      providerUserId: providerId,
      email,
      emailVerified,
    });

    const fresh = await this.usersService.findById(newUser.id);
    return this.issueTokens(fresh);
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const profileType = await this.getProfileType(user);
    const accessToken = this.signAccessToken(user, profileType);
    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresAt = new Date(
      Date.now() + parseDuration(this.config.jwtRefreshExpiresIn),
    );

    await this.usersService.setRefreshToken(
      user.id,
      this.hashToken(refreshToken),
      refreshExpiresAt,
    );

    return {
      accessToken,
      refreshToken,
      user: await this.toSafeUser(user, profileType),
      subscription: await this.subscriptionFor(user),
    };
  }

  private async subscriptionFor(user: User): Promise<TenantSubscription> {
    return (
      (await this.tenantsService.getSubscription(user.tenantId)) ?? {
        status: 'inactive',
        plan: null,
        paidUntil: null,
      }
    );
  }

  private signAccessToken(user: User, profileType: ProfileType | null): string {
    const roles = user.roles.map((role) => role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((role) => role.permissions.map((p) => p.name)),
      ),
    ];

    const baseModules = [
      ...new Set(
        user.roles.flatMap((role) => role.modules.map((m) => m.pageKey)),
      ),
    ];

    const profileTypeModules: string[] = profileType?.config?.modules
      ? Array.isArray(profileType.config.modules)
        ? ([...new Set(profileType.config.modules)] as string[])
        : []
      : [];

    const effectiveModules: string[] =
      profileTypeModules.length > 0 ? profileTypeModules : baseModules;

    const moduleOverrides = user.detail?.details?.moduleOverrides as
      { add: string[]; remove: string[] } | undefined;

    if (moduleOverrides) {
      if (moduleOverrides.add?.length) {
        effectiveModules.push(
          ...moduleOverrides.add.filter((m) => !effectiveModules.includes(m)),
        );
      }
      if (moduleOverrides.remove?.length) {
        effectiveModules.splice(
          0,
          effectiveModules.length,
          ...effectiveModules.filter(
            (m) => !moduleOverrides.remove.includes(m),
          ),
        );
      }
    }

    const modules = [...new Set(effectiveModules)];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles,
      permissions,
      modules,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.config.jwtAccessExpiresIn as StringValue,
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private effectiveModuleTitles(
    user: User,
    profileType: ProfileType | null,
  ): string[] {
    const roleModules =
      user.roles?.flatMap((role) => role.modules?.map((m) => m.name) ?? []) ??
      [];

    const baseModules =
      Array.isArray(profileType?.config?.modules) &&
      profileType.config.modules.length > 0
        ? (profileType.config.modules as string[])
        : roleModules;

    const moduleOverrides = user.detail?.details?.moduleOverrides as
      { add?: string[]; remove?: string[] } | undefined;

    const set = new Set(baseModules);
    if (moduleOverrides?.add?.length) {
      moduleOverrides.add.forEach((m) => set.add(m));
    }
    if (moduleOverrides?.remove?.length) {
      moduleOverrides.remove.forEach((m) => set.delete(m));
    }
    return [...set];
  }

  private async toSafeUser(
    user: User,
    profileType: ProfileType | null,
  ): Promise<SafeUser> {
    const companyComplete = await this.companyRepository.exists({
      where: { tenantId: user.tenantId },
    });

    const effectiveModules = this.effectiveModuleTitles(user, profileType);
    const assignedRole =
      profileType?.key ??
      user.roles?.find((assigned) => assigned.name !== 'user')?.name ??
      (effectiveModules.includes('Travel') ? 'travel-agent' : null);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      tenantId: user.tenantId,
      isActive: user.isActive,
      isApproved: user.isApproved ?? false,
      isEmailVerified: user.isEmailVerified,
      detail: user.detail,
      profileType: profileType
        ? { id: profileType.id, name: profileType.name, key: profileType.key }
        : null,
      assignedRole,
      modules: effectiveModules,
      companyComplete,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async getProfileType(user: User): Promise<ProfileType | null> {
    const profileTypeId = user.detail?.details?.profileTypeId;
    if (typeof profileTypeId !== 'string') return null;
    return this.profileTypeRepository.findOne({ where: { id: profileTypeId } });
  }
}
