import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UpdateCompanySettingsDto } from './update-company-settings.dto';

export class OnboardCompanyDto extends UpdateCompanySettingsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string = '';
}
