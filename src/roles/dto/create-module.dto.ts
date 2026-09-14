import {
  IsString,
  Length,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'pageKey must be lowercase alphanumeric with hyphens',
  })
  pageKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
