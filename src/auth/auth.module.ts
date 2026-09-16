import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenants/tenants.module';
import { AppConfigService } from '../config/app-config.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { OAuthIdentity } from './entities/oauth-identity.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { CompanySetting } from '../company/entities/company-setting.entity';
import { ProfileType } from '../users/entities/profile-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PasswordResetToken,
      OAuthIdentity,
      CompanySetting,
      ProfileType,
    ]),
    UsersModule,
    TenantsModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtAccessSecret,
        signOptions: {
          expiresIn: config.jwtAccessExpiresIn as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
})
export class AuthModule {}
