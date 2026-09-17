import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Patch,
} from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { SearchDestinationsQueryDto } from './dto/search-destinations-query.dto';
import { DestinationsService } from './destinations.service';

@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Get()
  @Permissions('destinations:read', 'vouchers:read')
  findAll() {
    return this.destinationsService.findAll();
  }

  @Get('search')
  @Permissions('destinations:read', 'vouchers:read')
  search(@Query() query: SearchDestinationsQueryDto) {
    return this.destinationsService.search(query.q);
  }

  @Post()
  @Permissions('destinations:create', 'vouchers:create')
  create(@Body() dto: CreateDestinationDto) {
    return this.destinationsService.create(dto);
  }

  @Patch(':id')
  @Permissions('destinations:create', 'vouchers:create')
  update(@Param('id') id: string, @Body() dto: UpdateDestinationDto) {
    return this.destinationsService.update(id, dto);
  }

  @Get(':id')
  @Permissions('destinations:read', 'vouchers:read')
  findOne(@Param('id') id: string) {
    return this.destinationsService.findOne(id);
  }

  @Delete(':id')
  @Permissions('destinations:delete', 'vouchers:create')
  async remove(@Param('id') id: string) {
    try {
      return await this.destinationsService.remove(id);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw error;
    }
  }
}
