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
import { TravelSettingsService } from './travel-settings.service';
import { TravelSettings } from './entities/travel-settings.entity';
import { TravelVoucherSequence } from './entities/travel-voucher-sequence.entity';
import { DataSource } from 'typeorm';
import { JwtUser } from '../common/decorators/current-user.decorator';

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
    private readonly travelSettingsService: TravelSettingsService,
    private readonly dataSource: DataSource,
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
    if (data.journeyDate && data.hotels) {
      for (const hotel of data.hotels) {
        if (hotel.checkinDate && hotel.checkinDate < data.journeyDate) {
          throw new BadRequestException('Hotel check-in date cannot be before the journey date');
        }
        if (hotel.checkoutDate && hotel.checkoutDate < data.journeyDate) {
          throw new BadRequestException('Hotel check-out date cannot be before the journey date');
        }
        if (hotel.checkinDate && hotel.checkoutDate && hotel.checkoutDate < hotel.checkinDate) {
          throw new BadRequestException('Hotel check-out date cannot be before check-in date');
        }
      }
    }
    if (data.journeyDate && data.itineraries) {
      for (const itinerary of data.itineraries) {
        if (itinerary.date && itinerary.date < data.journeyDate) {
          throw new BadRequestException('Itinerary date cannot be before the journey date');
        }
      }
    }
    const existingTitle = data.customerName?.match(/^(Mr|Mrs|Ms)\s+/i)?.[1];
    const title = data.customerTitle && ['Mr', 'Mrs', 'Ms'].includes(data.customerTitle)
      ? data.customerTitle
      : existingTitle
        ? existingTitle.charAt(0).toUpperCase() + existingTitle.slice(1).toLowerCase()
        : '';
    const normalizedCustomerName = data.customerName
      ? `${title ? `${title} ` : ''}${capitalizeWords(data.customerName.replace(/^(Mr|Mrs|Ms)\s+/i, ''))}`.trim()
      : data.customerName;
    const normalizedData = {
      ...data,
      customerName: normalizedCustomerName,
      packageName: data.packageName ? capitalizeWords(data.packageName) : data.packageName,
      travellers: data.travellers?.map((traveller) => ({
        ...traveller,
        name: traveller.name ? capitalizeWords(traveller.name) : traveller.name,
      })),
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
    user?: JwtUser,
  ): Promise<ConfirmationVoucher> {
    const tenantId = this.tenantContext.require();
    const isSystemAdmin = user?.roles?.includes('systemadmin') ?? false;
    let voucherNo = isSystemAdmin && dto.voucherNo?.trim()
      ? dto.voucherNo.trim()
      : '';
    if (!voucherNo) {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const candidate = await this.nextVoucherNumber(tenantId);
        const existing = await this.voucherRepository.findOne({
          where: { voucherNo: candidate, tenantId },
        });
        if (!existing) {
          voucherNo = candidate;
          break;
        }
      }
      if (!voucherNo) {
        throw new ConflictException('Unable to generate a unique voucher number');
      }
    } else {
      const existing = await this.voucherRepository.findOne({
        where: { voucherNo, tenantId },
      });
      if (existing) {
        voucherNo = await this.findNextAvailableVoucherNumber(tenantId);
      }
    }
    const entity = this.voucherRepository.create({
      ...ConfirmationVouchersService.buildEntity(
        voucherNo,
        dto.data,
        dto.packageId,
      ),
      tenantId,
      termsSnapshot: await this.termsService.listActiveSnapshots(tenantId),
    });
    return this.voucherRepository.save(entity);
  }

  async nextNumber(): Promise<{ voucherNo: string; sequence: number }> {
    const tenantId = this.tenantContext.require();
    return this.peekNextVoucherNumber(tenantId).then((voucherNo) => ({
      voucherNo,
      sequence: Number(voucherNo.match(/(\d+)$/)?.[1] ?? 0),
    }));
  }

  private async peekNextVoucherNumber(tenantId: string): Promise<string> {
    const settings = await this.travelSettingsService.getOrCreate();
    const latestValue = await this.getLatestVoucherSequence(tenantId, settings.voucherPrefix ?? '', settings.voucherSuffix ?? '');
    const nextValue = latestValue + 1;
    return this.formatVoucherNumber(settings.voucherPrefix ?? '', settings.voucherSuffix ?? '', nextValue);
  }

  private async nextVoucherNumber(tenantId: string): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const settings = await manager.findOne(TravelSettings, { where: { tenantId } });
      const prefix = settings?.voucherPrefix ?? '';
      const configuredSuffix = settings?.voucherSuffix ?? '';
      const sequenceRepository = manager.getRepository(TravelVoucherSequence);
      let sequence = await sequenceRepository.findOne({ where: { tenantId }, lock: { mode: 'pessimistic_write' } });
      if (!sequence) sequence = await sequenceRepository.save(sequenceRepository.create({ tenantId, currentValue: 0 }));
      const latestValue = await this.getLatestVoucherSequence(tenantId, prefix, configuredSuffix, manager);
      sequence.currentValue = latestValue + 1;
      await sequenceRepository.save(sequence);
      return this.formatVoucherNumber(prefix, configuredSuffix, sequence.currentValue);
    });
  }

  private formatVoucherNumber(prefix: string, suffix: string, value: number): string {
    const numericTemplate = /^\d+$/.test(suffix) ? suffix : '001';
    const literalSuffix = suffix && !/^\d+$/.test(suffix) ? suffix : '';
    return `${prefix}${String(value).padStart(numericTemplate.length, '0')}${literalSuffix}`;
  }

  private async getLatestVoucherSequence(
    tenantId: string,
    prefix: string,
    suffix: string,
    manager = this.dataSource.manager,
  ): Promise<number> {
    const vouchers = await manager.find(ConfirmationVoucher, {
      where: { tenantId },
      select: { voucherNo: true },
    });
    const numericTemplate = /^\d+$/.test(suffix) ? suffix : '001';
    const literalSuffix = suffix && !/^\d+$/.test(suffix) ? suffix : '';
    const values = vouchers.flatMap((voucher) => {
      const value = voucher.voucherNo ?? '';
      if (!value.startsWith(prefix) || (literalSuffix && !value.endsWith(literalSuffix))) return [];
      const end = literalSuffix ? value.length - literalSuffix.length : value.length;
      const numeric = value.slice(prefix.length, end);
      return /^\d+$/.test(numeric) ? [Number(numeric)] : [];
    });
    return values.length ? Math.max(...values) : 0;
  }

  private async findNextAvailableVoucherNumber(tenantId: string): Promise<string> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = await this.nextVoucherNumber(tenantId);
      const existing = await this.voucherRepository.findOne({
        where: { voucherNo: candidate, tenantId },
      });
      if (!existing) return candidate;
    }
    throw new ConflictException('Unable to generate a unique voucher number');
  }

  async update(
    id: string,
    dto: UpdateConfirmationVoucherDto,
    user?: JwtUser,
  ): Promise<ConfirmationVoucher> {
    const tenantId = this.tenantContext.require();
    const voucher = await this.findById(id);
    const isSystemAdmin = user?.roles?.includes('systemadmin') ?? false;
    const nextVoucherNo = isSystemAdmin && dto.voucherNo?.trim()
      ? dto.voucherNo.trim()
      : voucher.voucherNo;

    if (isSystemAdmin && dto.voucherNo && dto.voucherNo !== voucher.voucherNo) {
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
