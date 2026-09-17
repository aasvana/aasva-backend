import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class ItineraryTemplateDayDto {
  @IsInt() @Min(1) dayOrder: number;
  @IsString() subject: string;
  @IsString() description: string;
}

export class CreatePackageDto {
  @IsString() @IsNotEmpty() subject: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItineraryTemplateDayDto)
  days: ItineraryTemplateDayDto[];
}
