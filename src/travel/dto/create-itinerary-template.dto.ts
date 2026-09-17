import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class ItineraryTemplateDayDto {
  @IsInt() @Min(1) dayOrder: number;
  @IsString() subject: string;
  @IsString() description: string;
}

export class CreateItineraryTemplateDto {
  @IsString() @IsNotEmpty() subject: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsIn(['active', 'inactive']) status?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItineraryTemplateDayDto)
  days: ItineraryTemplateDayDto[];
}
