import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySetting } from './entities/company-setting.entity';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { ImageKitModule } from '../imagekit/imagekit.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanySetting]),
    ImageKitModule,
    TenantsModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
