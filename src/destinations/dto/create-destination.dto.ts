import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDestinationDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional() @IsString() @MaxLength(255) originalName?: string;

  @IsOptional() @IsString() @MaxLength(255) street?: string;
  @IsOptional() @IsString() @MaxLength(255) city?: string;
  @IsOptional() @IsString() @MaxLength(255) state?: string;
  @IsOptional() @IsString() @MaxLength(255) country?: string;
  @IsOptional() @IsString() @MaxLength(8) countryCode?: string;
  @IsOptional() @IsString() @MaxLength(32) postalCode?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() externalId?: string;
}
