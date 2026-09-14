import { PartialType } from '@nestjs/mapped-types';
import { CreateConfirmationVoucherDto } from './create-confirmation-voucher.dto';

export class UpdateConfirmationVoucherDto extends PartialType(
  CreateConfirmationVoucherDto,
) {}
