import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoucherItineraryDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  itinerary: string;
}
