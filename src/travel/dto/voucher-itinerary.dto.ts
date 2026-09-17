import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoucherItineraryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  itinerary?: string;
}
