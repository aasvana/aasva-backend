import {
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class VoucherTravellerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,3}$/)
  age: string;

  @IsString()
  @IsIn(['male', 'female'])
  gender: string;
}
