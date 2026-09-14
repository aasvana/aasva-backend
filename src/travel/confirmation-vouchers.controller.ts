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
import { ConfirmationVouchersService } from './confirmation-vouchers.service';
import { CreateConfirmationVoucherDto } from './dto/create-confirmation-voucher.dto';
import { UpdateConfirmationVoucherDto } from './dto/update-confirmation-voucher.dto';
import { FindVouchersQueryDto } from './dto/find-vouchers-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('vouchers')
export class ConfirmationVouchersController {
  constructor(
    private readonly confirmationVouchersService: ConfirmationVouchersService,
  ) {}

  @Get()
  @Permissions('vouchers:read')
  findAll(@Query() query: FindVouchersQueryDto) {
    return this.confirmationVouchersService.findAll(query);
  }

  @Get(':id')
  @Permissions('vouchers:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.confirmationVouchersService.findById(id);
  }

  @Post()
  @Permissions('vouchers:create')
  create(@Body() dto: CreateConfirmationVoucherDto) {
    return this.confirmationVouchersService.create(dto);
  }

  @Patch(':id')
  @Permissions('vouchers:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConfirmationVoucherDto,
  ) {
    return this.confirmationVouchersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('vouchers:delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.confirmationVouchersService.remove(id);
  }
}
