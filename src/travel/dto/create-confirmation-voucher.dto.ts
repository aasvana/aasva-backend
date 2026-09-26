import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { VoucherDataDto } from './voucher-data.dto';

export class CreateConfirmationVoucherDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  voucherNo?: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => VoucherDataDto)
  data: VoucherDataDto;
}
