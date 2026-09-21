import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateTravelSettingsDto } from './dto/update-travel-settings.dto';
import { TravelSettingsService } from './travel-settings.service';

@Controller('travel/settings')
export class TravelSettingsController {
  constructor(private readonly travelSettingsService: TravelSettingsService) {}

  @Get()
  get() {
    return this.travelSettingsService.getOrCreate();
  }

  @Patch()
  update(@Body() dto: UpdateTravelSettingsDto) {
    return this.travelSettingsService.update(dto);
  }
}
