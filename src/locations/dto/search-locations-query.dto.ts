import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchLocationsQueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  q: string;
}
