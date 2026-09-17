import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoucherHotelDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  hotelName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mealType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  roomCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  maxOccupancy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  adults?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  children?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  extraMattress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  checkinDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  checkoutDate?: string;
}
