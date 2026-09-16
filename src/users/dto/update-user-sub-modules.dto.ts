import { ArrayUnique, IsArray, IsString, IsOptional } from 'class-validator';

export class UpdateUserSubModulesDto {
  @IsString()
  module: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  subModules?: string[];
}
