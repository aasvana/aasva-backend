import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TravelGeneralDetailDto } from './travel-general-detail.dto';

export class UpdateTravelSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  voucherPrefix?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  voucherSuffix?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoicePrefix?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceSuffix?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  defaultPaymentType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultTaxRate?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TravelGeneralDetailDto)
  generalDetails?: TravelGeneralDetailDto[];
}
