import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHotelDto {
  @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @IsString() @IsNotEmpty() destinationId: string;
  @IsOptional() @IsString() @MaxLength(8) starRating?: string;
  @IsOptional() @IsString() notes?: string;
}
