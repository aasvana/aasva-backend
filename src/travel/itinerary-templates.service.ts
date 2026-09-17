import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { CreateItineraryTemplateDto } from './dto/create-itinerary-template.dto';
import { UpdateItineraryTemplateDto } from './dto/update-itinerary-template.dto';
import {
  ItineraryTemplate,
  ItineraryTemplateDay,
} from './entities/itinerary-template.entity';

@Injectable()
export class ItineraryTemplatesService {
  constructor(
    @InjectRepository(ItineraryTemplate)
    private readonly templates: Repository<ItineraryTemplate>,
    private readonly tenantContext: TenantContext,
  ) {}
  async search(subject?: string) {
    return this.templates.find({
      where: {
        tenantId: this.tenantContext.require(),
        ...(subject
          ? { normalizedSubject: ILike(`%${subject.trim().toLowerCase()}%`) }
          : {}),
      },
      relations: { days: true },
      order: { updatedAt: 'DESC' },
      take: 20,
    });
  }
  async findOne(id: string) {
    const template = await this.templates.findOne({
      where: { id, tenantId: this.tenantContext.require() },
      relations: { days: true },
    });
    if (!template) throw new NotFoundException('Itinerary template not found');
    template.days.sort((a, b) => a.dayOrder - b.dayOrder);
    return template;
  }
  async create(dto: CreateItineraryTemplateDto) {
    const template = this.templates.create({
      subject: dto.subject.trim(),
      normalizedSubject: dto.subject.trim().toLowerCase(),
      tenantId: this.tenantContext.require(),
      price: dto.price ?? 0,
      status: dto.status ?? 'active',
      days: dto.days.map((day) => ({ ...day })) as ItineraryTemplateDay[],
    });
    return this.templates.save(template);
  }
  async update(id: string, dto: UpdateItineraryTemplateDto) {
    const template = await this.findOne(id);
    Object.assign(template, {
      ...dto,
      subject: dto.subject?.trim() ?? template.subject,
      normalizedSubject:
        dto.subject?.trim().toLowerCase() ?? template.normalizedSubject,
    });
    if (dto.days) template.days = dto.days as ItineraryTemplateDay[];
    return this.templates.save(template);
  }
  async remove(id: string) {
    await this.templates.delete({ id, tenantId: this.tenantContext.require() });
  }
}
