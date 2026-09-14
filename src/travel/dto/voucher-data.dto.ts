import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { VoucherTravellerDto } from './voucher-traveller.dto';
import { VoucherHotelDto } from './voucher-hotel.dto';
import { VoucherItineraryDto } from './voucher-itinerary.dto';

export class VoucherDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/)
  mobileNo: string;

  @IsEmail()
  @MaxLength(255)
  emailAddress: string;

  @IsString()
  @MaxLength(255)
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  agentName?: string;

  @IsDateString()
  journeyDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  boardingAirline: string;

  @IsDateString()
  boardingDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  boardingFrom: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  boardingTo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  boardingDepartureTime: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  boardingArrivalTime: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  returnAirline: string;

  @IsDateString()
  returnDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  returnFrom: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  returnTo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  returnDepartureTime: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  returnArrivalTime: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VoucherTravellerDto)
  travellers: VoucherTravellerDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VoucherHotelDto)
  hotels: VoucherHotelDto[];

  @IsString()
  @MinLength(1)
  packageIncluded: string;

  @IsString()
  @MinLength(1)
  packageExcluded: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VoucherItineraryDto)
  itineraries: VoucherItineraryDto[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  checkinTime: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  checkoutTime: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  smokingPolicy: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  consumptionOfLiquor: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  assistanceName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/)
  assistancePhone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  supportName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/)
  supportPhone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  emergencyName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/)
  emergencyPhone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  voucherNo: string;

  @IsDateString()
  bookingDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/)
  totalAmount: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  paymentType: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amountReceived: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amountBalanced: string;
}
