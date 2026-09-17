import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchHotelsQueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  q: string;
}
