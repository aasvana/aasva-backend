import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { VoucherDataDto } from './voucher-data.dto';

export class CreateConfirmationVoucherDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  voucherNo: string;

  @IsObject()
  @ValidateNested()
  @Type(() => VoucherDataDto)
  data: VoucherDataDto;
}
