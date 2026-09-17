import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseConfigService } from './config/database-config.service';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { TravelModule } from './travel/travel.module';
import { CompanyModule } from './company/company.module';
import { ImageKitModule } from './imagekit/imagekit.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantModule } from './common/tenant/tenant.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { DestinationsModule } from './destinations/destinations.module';
import { HotelsModule } from './hotels/hotels.module';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useClass: DatabaseConfigService,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    TenantModule,
    TenantsModule,
    MailModule,
    UsersModule,
    RolesModule,
    AuthModule,
    TravelModule,
    CompanyModule,
    ImageKitModule,
    DestinationsModule,
    HotelsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
