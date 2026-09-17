import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PackageDayDto {
  @IsInt()
  @Min(1)
  dayOrder: number;
  @IsString()
  subject: string;
  @IsString()
  description: string;
}

export class PackageImageDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}

export class PackageItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;
  @IsOptional()
  @IsString()
  shortDescription?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsUUID()
  destinationId?: string;
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
  @IsOptional()
  @IsInt()
  @Min(0)
  durationNights?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;
  @IsOptional()
  @IsIn(['PER_PERSON', 'PER_PACKAGE'])
  pricingType?: string;
  @IsOptional()
  @IsIn(['draft', 'active', 'inactive', 'archived'])
  status?: string;
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageDayDto)
  days: PackageDayDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageImageDto)
  images?: PackageImageDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  inclusions?: PackageItemDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageItemDto)
  exclusions?: PackageItemDto[];
}
