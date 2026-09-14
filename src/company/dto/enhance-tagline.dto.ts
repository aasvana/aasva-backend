import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EnhanceTaglineDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagline?: string;
}
