import { IsString, MaxLength } from 'class-validator';

export class TravelGeneralDetailDto {
  @IsString()
  @MaxLength(64)
  id: string;

  @IsString()
  @MaxLength(64)
  key: string;

  @IsString()
  @MaxLength(128)
  label: string;

  @IsString()
  @MaxLength(500)
  value: string;
}
