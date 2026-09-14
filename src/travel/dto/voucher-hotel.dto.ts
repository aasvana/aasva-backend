import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class VoucherHotelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  destination: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  hotelName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mealType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  room: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  roomCategory: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/)
  maxOccupancy: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/)
  adults: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/)
  children: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/)
  extraMattress: string;

  @IsString()
  @IsNotEmpty()
  checkinDate: string;

  @IsString()
  @IsNotEmpty()
  checkoutDate: string;
}
