import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { VoucherTravellerDto } from './voucher-traveller.dto';
import { VoucherHotelDto } from './voucher-hotel.dto';
import { VoucherItineraryDto } from './voucher-itinerary.dto';

export class VoucherDataDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  customerTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  packageName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  emailAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  agentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numberOfPersons?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numberOfTourDays?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  journeyDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  boardingAirline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  boardingDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  boardingFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  boardingTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  boardingDepartureTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  boardingArrivalTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  returnAirline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  returnDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  returnFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  returnTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  returnDepartureTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  returnArrivalTime?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoucherTravellerDto)
  travellers?: VoucherTravellerDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoucherHotelDto)
  hotels?: VoucherHotelDto[];

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  packageIncluded?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  packageExcluded?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoucherItineraryDto)
  itineraries?: VoucherItineraryDto[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  checkinTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  checkoutTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  smokingPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  consumptionOfLiquor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  assistanceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  assistancePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supportName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  supportPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  voucherNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  bookingDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  totalAmount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  paymentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  amountReceived?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  amountBalanced?: string;
}
