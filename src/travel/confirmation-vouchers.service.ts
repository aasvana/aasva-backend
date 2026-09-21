import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfirmationVoucher } from './entities/confirmation-voucher.entity';
import { CreateConfirmationVoucherDto } from './dto/create-confirmation-voucher.dto';
import { UpdateConfirmationVoucherDto } from './dto/update-confirmation-voucher.dto';
import { FindVouchersQueryDto } from './dto/find-vouchers-query.dto';
import { VoucherDataDto } from './dto/voucher-data.dto';
import { TermsService } from '../terms/terms.service';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { capitalizeWords } from '../common/utils/text-format.util';

export interface PaginatedVouchers {
  items: ConfirmationVoucher[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ConfirmationVouchersService {
  constructor(
    @InjectRepository(ConfirmationVoucher)
    private readonly voucherRepository: Repository<ConfirmationVoucher>,
    private readonly tenantContext: TenantContext,
    private readonly termsService: TermsService,
  ) {}

  findAll(query: FindVouchersQueryDto): Promise<PaginatedVouchers> {
    const { page, limit, search, sortBy, sortOrder } = query;
    const tenantId = this.tenantContext.require();

    const qb = this.voucherRepository
      .createQueryBuilder('voucher')
      .where('voucher.tenantId = :tenantId', { tenantId });

    if (search) {
      qb.andWhere(
        '(voucher.voucherNo ILIKE :search OR voucher.customerName ILIKE :search OR voucher.companyName ILIKE :search OR voucher.agentName ILIKE :search OR voucher.paymentType ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    return qb
      .orderBy(
        `voucher.${sortBy}`,
        sortOrder.toUpperCase() as 'ASC' | 'DESC',
        'NULLS LAST',
      )
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
      .then(([items, total]) => ({ items, total, page, limit }));
  }

  async findById(id: string): Promise<ConfirmationVoucher> {
    const voucher = await this.voucherRepository.findOne({
      where: { id, tenantId: this.tenantContext.require() },
    });
    if (!voucher) {
      throw new NotFoundException('Confirmation voucher not found');
    }
    return voucher;
  }

  private static sameVoucherNumber(
    topLevel: string,
    data?: Partial<VoucherDataDto>,
  ): boolean {
    return !data?.voucherNo || topLevel === data.voucherNo;
  }

  private static buildEntity(
    voucherNo: string,
    data: Partial<VoucherDataDto>,
    packageId?: string,
  ): Partial<ConfirmationVoucher> {
    if (!ConfirmationVouchersService.sameVoucherNumber(voucherNo, data)) {
      throw new BadRequestException('voucherNo must match data.voucherNo');
    }
    if (!data.customerName?.trim()) {
      throw new BadRequestException('customerName is required to save a draft');
    }
    if (!data.packageName?.trim()) {
      throw new BadRequestException('packageName is required to save a voucher');
    }
    const title = data.customerTitle && ['Mr', 'Mrs', 'Ms'].includes(data.customerTitle)
      ? data.customerTitle
      : '';
    const normalizedCustomerName = data.customerName
      ? `${title ? `${title} ` : ''}${capitalizeWords(data.customerName.replace(/^(Mr|Mrs|Ms)\s+/i, ''))}`.trim()
      : data.customerName;
    const normalizedData = {
      ...data,
      customerName: normalizedCustomerName,
      packageName: data.packageName ? capitalizeWords(data.packageName) : data.packageName,
      hotels: data.hotels?.map((hotel) => ({
        ...hotel,
        destination: hotel.destination ? capitalizeWords(hotel.destination) : hotel.destination,
        hotelName: hotel.hotelName ? capitalizeWords(hotel.hotelName) : hotel.hotelName,
      })),
    };
    delete normalizedData.customerTitle;
    return {
      voucherNo,
      customerName: normalizedData.customerName ?? '',
      companyName: normalizedData.companyName ?? '',
      agentName: normalizedData.agentName ?? '',
      paymentType: normalizedData.paymentType ?? '',
      journeyDate: normalizedData.journeyDate ? new Date(normalizedData.journeyDate) : null,
      packageId: packageId ?? null,
      data: normalizedData,
    };
  }

  async create(
    dto: CreateConfirmationVoucherDto,
  ): Promise<ConfirmationVoucher> {
    const tenantId = this.tenantContext.require();
    const existing = await this.voucherRepository.findOne({
      where: { voucherNo: dto.voucherNo, tenantId },
    });
    if (existing) {
      throw new ConflictException(
        `A confirmation voucher with number ${dto.voucherNo} already exists`,
      );
    }
    const entity = this.voucherRepository.create({
      ...ConfirmationVouchersService.buildEntity(
        dto.voucherNo,
        dto.data,
        dto.packageId,
      ),
      tenantId,
      termsSnapshot: await this.termsService.listActiveSnapshots(tenantId),
    });
    return this.voucherRepository.save(entity);
  }

  async update(
    id: string,
    dto: UpdateConfirmationVoucherDto,
  ): Promise<ConfirmationVoucher> {
    const tenantId = this.tenantContext.require();
    const voucher = await this.findById(id);
    const nextVoucherNo = dto.voucherNo ?? voucher.voucherNo;

    if (dto.voucherNo && dto.voucherNo !== voucher.voucherNo) {
      const existing = await this.voucherRepository.findOne({
        where: { voucherNo: dto.voucherNo, tenantId },
      });
      if (existing) {
        throw new ConflictException(
          `A confirmation voucher with number ${dto.voucherNo} already exists`,
        );
      }
    }

    const patch = dto.data
      ? ConfirmationVouchersService.buildEntity(
          nextVoucherNo,
          dto.data,
          dto.packageId,
        )
      : {};

    const merged = this.voucherRepository.merge(voucher, patch);
    if (dto.packageId !== undefined) {
      merged.packageId = dto.packageId ?? null;
    }
    if (dto.voucherNo) {
      merged.voucherNo = dto.voucherNo;
      merged.data = {
        ...merged.data,
        voucherNo: dto.voucherNo,
      };
    }

    return this.voucherRepository.save(merged);
  }

  async remove(id: string): Promise<void> {
    const result = await this.voucherRepository.delete({
      id,
      tenantId: this.tenantContext.require(),
    });
    if (!result.affected) {
      throw new NotFoundException('Confirmation voucher not found');
    }
  }
}
