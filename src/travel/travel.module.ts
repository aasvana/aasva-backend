import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermsModule } from '../terms/terms.module';
import { ConfirmationVoucher } from './entities/confirmation-voucher.entity';
import { ConfirmationVouchersService } from './confirmation-vouchers.service';
import { ConfirmationVouchersController } from './confirmation-vouchers.controller';
import { TravelSettings } from './entities/travel-settings.entity';
import { TravelSettingsController } from './travel-settings.controller';
import { TravelSettingsService } from './travel-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConfirmationVoucher, TravelSettings]), TermsModule],
  controllers: [ConfirmationVouchersController, TravelSettingsController],
  providers: [ConfirmationVouchersService, TravelSettingsService],
  exports: [ConfirmationVouchersService, TravelSettingsService],
})
export class TravelModule {}
