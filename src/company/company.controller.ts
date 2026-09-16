import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { CompanyService } from './company.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { OnboardCompanyDto } from './dto/onboard-company.dto';
import { EnhanceTaglineDto } from './dto/enhance-tagline.dto';
import { SkipSubscriptionGate } from '../common/decorators/skip-subscription-gate.decorator';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  getSettings() {
    return this.companyService.getOrCreate();
  }

  @Patch()
  updateSettings(@Body() dto: UpdateCompanySettingsDto) {
    return this.companyService.update(dto);
  }

  @Post('onboarding')
  @SkipSubscriptionGate()
  onboard(@Body() dto: OnboardCompanyDto) {
    return this.companyService.onboard(dto);
  }

  @Post('enhance-tagline')
  async enhanceTagline(@Body() dto: EnhanceTaglineDto) {
    const enhanced = await this.companyService.enhanceTagline(dto.tagline);
    return { enhanced };
  }
}
