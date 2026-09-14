import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  shortName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  logo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  gstin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  cin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultTaxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  incorporationDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  authorizedSignatory?: string;
}
