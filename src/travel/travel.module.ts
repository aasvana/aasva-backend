import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfirmationVoucher } from './entities/confirmation-voucher.entity';
import { ConfirmationVouchersService } from './confirmation-vouchers.service';
import { ConfirmationVouchersController } from './confirmation-vouchers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConfirmationVoucher])],
  controllers: [ConfirmationVouchersController],
  providers: [ConfirmationVouchersService],
  exports: [ConfirmationVouchersService],
})
export class TravelModule {}
