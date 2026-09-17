import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoucherTravellerDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  age?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;
}
