import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { FindTermsQueryDto } from './dto/find-terms-query.dto';
import { ReorderTermsDto } from './dto/reorder-terms.dto';
import { TermsService } from './terms.service';

@Controller('terms-conditions')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  @Permissions('terms:read')
  list(@Query() query: FindTermsQueryDto) {
    return query.active
      ? this.termsService.listActive()
      : this.termsService.list();
  }

  @Post()
  @Permissions('terms:create')
  create(@Body() dto: CreateTermDto, @CurrentUser() user: JwtUser) {
    return this.termsService.create(dto, undefined, user.id);
  }

  @Patch('reorder')
  @Permissions('terms:update')
  reorder(@Body() dto: ReorderTermsDto) {
    return this.termsService.reorder(dto);
  }

  @Patch(':id')
  @Permissions('terms:update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTermDto) {
    return this.termsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('terms:delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.termsService.remove(id);
  }
}
