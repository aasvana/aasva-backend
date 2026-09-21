import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { GENERAL_DETAIL_KEYS } from './travel-settings.defaults';
import { TravelSettings } from './entities/travel-settings.entity';
import { UpdateTravelSettingsDto } from './dto/update-travel-settings.dto';

const TIME_KEYS = new Set(['checkinTime', 'checkoutTime']);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable()
export class TravelSettingsService {
  constructor(
    @InjectRepository(TravelSettings)
    private readonly settings: Repository<TravelSettings>,
    private readonly tenantContext: TenantContext,
  ) {}

  async getOrCreate(): Promise<TravelSettings> {
    const tenantId = this.tenantContext.require();
    let settings = await this.settings.findOne({ where: { tenantId } });
    if (!settings) {
      settings = this.settings.create({ tenantId, generalDetails: GENERAL_DETAIL_KEYS });
      settings = await this.settings.save(settings);
    }
    return settings;
  }

  async update(dto: UpdateTravelSettingsDto): Promise<TravelSettings> {
    const settings = await this.getOrCreate();
    if (dto.generalDetails) {
      for (const detail of dto.generalDetails) {
        if (TIME_KEYS.has(detail.key) && detail.value.trim() !== '' && !TIME_PATTERN.test(detail.value)) {
          throw new BadRequestException(`${detail.key} must use HH:mm format`);
        }
      }
    }
    Object.assign(settings, dto);
    return this.settings.save(settings);
  }
}
