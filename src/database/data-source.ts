import 'pg';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ProfileType } from '../users/entities/profile-type.entity';
import { UserDetail } from '../users/entities/user-detail.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';
import { Module } from '../roles/entities/module.entity';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { OAuthIdentity } from '../auth/entities/oauth-identity.entity';
import { ConfirmationVoucher } from '../travel/entities/confirmation-voucher.entity';
import { CompanySetting } from '../company/entities/company-setting.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_DATABASE ?? 'aasvaDB',
      }),
  entities: [
    User,
    ProfileType,
    UserDetail,
    Role,
    Permission,
    Module,
    PasswordResetToken,
    OAuthIdentity,
    ConfirmationVoucher,
    CompanySetting,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});
