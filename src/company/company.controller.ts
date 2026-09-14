import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { CompanyService } from './company.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { EnhanceTaglineDto } from './dto/enhance-tagline.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @Permissions('company:read')
  getSettings() {
    return this.companyService.getOrCreate();
  }

  @Patch()
  @Permissions('company:update')
  updateSettings(@Body() dto: UpdateCompanySettingsDto) {
    return this.companyService.update(dto);
  }

  @Post('enhance-tagline')
  @Permissions('company:update')
  async enhanceTagline(@Body() dto: EnhanceTaglineDto) {
    const enhanced = await this.companyService.enhanceTagline(dto.tagline);
    return { enhanced };
  }
}
