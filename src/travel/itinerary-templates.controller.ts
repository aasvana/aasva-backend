import {
  Body,
  Controller,
  Delete,
  Patch,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateItineraryTemplateDto } from './dto/create-itinerary-template.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdateItineraryTemplateDto } from './dto/update-itinerary-template.dto';
import { ItineraryTemplatesService } from './itinerary-templates.service';

@Controller('itinerary-templates')
export class ItineraryTemplatesController {
  constructor(private readonly service: ItineraryTemplatesService) {}
  @Get() @Permissions('vouchers:read') search(
    @Query('subject') subject?: string,
  ) {
    return this.service.search(subject);
  }
  @Get(':id') @Permissions('vouchers:read') findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Post() @Permissions('vouchers:create') create(
    @Body() dto: CreateItineraryTemplateDto,
  ) {
    return this.service.create(dto);
  }
  @Delete(':id') @Permissions('vouchers:create') remove(
    @Param('id') id: string,
  ) {
    return this.service.remove(id);
  }
  @Patch(':id') @Permissions('vouchers:create') update(
    @Param('id') id: string,
    @Body() dto: UpdateItineraryTemplateDto,
  ) {
    return this.service.update(id, dto);
  }
}

@Controller('packages')
export class PackagesController {
  constructor(private readonly service: ItineraryTemplatesService) {}
  @Get() @Permissions('vouchers:read') search(@Query('name') name?: string) {
    return this.service.search(name);
  }
  @Get(':id') @Permissions('vouchers:read') findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Post() @Permissions('vouchers:create') create(
    @Body() dto: CreatePackageDto,
  ) {
    return this.service.create(dto);
  }
  @Delete(':id') @Permissions('vouchers:create') remove(
    @Param('id') id: string,
  ) {
    return this.service.remove(id);
  }
  @Patch(':id') @Permissions('vouchers:create') update(
    @Param('id') id: string,
    @Body() dto: UpdateItineraryTemplateDto,
  ) {
    return this.service.update(id, dto);
  }
}
