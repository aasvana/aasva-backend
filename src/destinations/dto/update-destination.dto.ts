import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateDestinationDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(255) street?: string;
  @IsOptional() @IsString() @MaxLength(255) city?: string;
  @IsOptional() @IsString() @MaxLength(255) state?: string;
  @IsOptional() @IsString() @MaxLength(255) country?: string;
  @IsOptional() @IsString() @MaxLength(8) countryCode?: string;
  @IsOptional() @IsString() @MaxLength(32) postalCode?: string;
  @IsOptional() @IsNumber() latitude?: number | null;
  @IsOptional() @IsNumber() longitude?: number | null;
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() originalName?: string;
  @IsOptional() @IsString() source?: string | null;
  @IsOptional() @IsString() externalId?: string | null;
  @IsOptional() @IsIn(['active', 'inactive']) status?: string;
}
