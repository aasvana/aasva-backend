import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { TermsModule } from '../terms/terms.module';
import { TenantsService } from './tenants.service';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, SubscriptionPlan]), TermsModule],
  controllers: [PlansController],
  providers: [TenantsService, PlansService],
  exports: [TenantsService, PlansService],
})
export class TenantsModule {}
