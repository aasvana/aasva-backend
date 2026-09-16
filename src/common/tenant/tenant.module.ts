import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TenantContext } from './tenant-context.service';
import { TenantInterceptor } from './tenant.interceptor';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [
    TenantContext,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
  exports: [TenantContext],
})
export class TenantModule {}
