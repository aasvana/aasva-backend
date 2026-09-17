import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Delete,
} from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { SearchHotelsQueryDto } from './dto/search-hotels-query.dto';
import { HotelsService } from './hotels.service';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get()
  @Permissions('hotels:read', 'vouchers:read')
  findAll() {
    return this.hotelsService.findAll();
  }

  @Get('search')
  @Permissions('hotels:read', 'vouchers:read')
  search(@Query() query: SearchHotelsQueryDto) {
    return this.hotelsService.search(query.q);
  }

  @Post()
  @Permissions('hotels:create', 'vouchers:create')
  create(@Body() dto: CreateHotelDto) {
    return this.hotelsService.create(dto);
  }

  @Patch(':id')
  @Permissions('hotels:create', 'vouchers:create')
  update(@Param('id') id: string, @Body() dto: CreateHotelDto) {
    return this.hotelsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('hotels:delete', 'vouchers:create')
  remove(@Param('id') id: string) {
    return this.hotelsService.remove(id);
  }

  @Get('destination/:destinationId')
  @Permissions('hotels:read', 'vouchers:read')
  byDestination(@Param('destinationId') destinationId: string) {
    return this.hotelsService.byDestination(destinationId);
  }
}
