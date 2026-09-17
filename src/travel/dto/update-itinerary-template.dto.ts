import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
class PackageDayUpdateDto {
  @IsNumber() dayOrder: number;
  @IsString() subject: string;
  @IsString() description: string;
}
export class UpdateItineraryTemplateDto {
  @IsOptional() @IsString() @MaxLength(255) subject?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsIn(['active', 'inactive']) status?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageDayUpdateDto)
  days?: PackageDayUpdateDto[];
}
