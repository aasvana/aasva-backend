import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { Destination } from './entities/destination.entity';
import {
  NominatimService,
  NominatimResult,
} from '../locations/nominatim.service';

const normalize = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();
const slugify = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const cityOf = (address: Record<string, string>) =>
  address.city ??
  address.town ??
  address.municipality ??
  address.village ??
  address.suburb ??
  '';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(Destination)
    private readonly destinations: Repository<Destination>,
    private readonly tenantContext: TenantContext,
    private readonly nominatim: NominatimService,
  ) {}

  async search(
    query: string,
  ): Promise<Array<Destination | CreateDestinationDto>> {
    this.tenantContext.require();
    const normalized = normalize(query);
    const local = await this.destinations
      .createQueryBuilder('destination')
      .where(
        '(destination.normalized_name LIKE :query OR LOWER(destination.display_name) LIKE :query OR LOWER(destination.city) LIKE :query OR LOWER(destination.original_name) LIKE :query)',
        { query: `%${normalized}%` },
      )
      .andWhere(
        "(LOWER(destination.country) = 'india' OR destination.country = '')",
      )
      .orderBy('destination.name', 'ASC')
      .limit(20)
      .getMany();
    if (local.length) return local;
    const remote = await this.nominatim.search(query.trim());
    return remote
      .map((result) => this.normalizeRemote(result))
      .filter(
        (result): result is CreateDestinationDto =>
          !!result && result.countryCode?.toLowerCase() === 'in',
      );
  }

  async findAll(): Promise<Destination[]> {
    this.tenantContext.require();
    return this.destinations.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateDestinationDto): Promise<Destination> {
    this.tenantContext.require();
    const name = dto.name.trim();
    const normalizedName = normalize(name);
    const fingerprint = this.fingerprint(dto);
    const existing = await this.destinations.findOne({
      where: { fingerprint },
    });
    if (existing) return existing;
    return this.destinations.save(
      this.destinations.create({
        ...dto,
        name,
        originalName: dto.originalName?.trim() || name,
        slug: slugify(name),
        normalizedName,
        street: dto.street?.trim() ?? '',
        city: dto.city?.trim() ?? '',
        state: dto.state?.trim() ?? '',
        country: dto.country?.trim() ?? '',
        countryCode: dto.countryCode?.trim().toLowerCase() ?? '',
        postalCode: dto.postalCode?.trim() ?? '',
        displayName: dto.displayName?.trim() ?? name,
        source: dto.source ?? null,
        externalId: dto.externalId ?? null,
        status: 'active',
        fingerprint,
      }),
    );
  }

  async findOne(id: string): Promise<Destination> {
    const destination = await this.destinations.findOne({
      where: { id },
    });
    if (!destination) throw new NotFoundException('Destination not found');
    return destination;
  }

  async remove(id: string): Promise<void> {
    this.tenantContext.require();
    const destination = await this.destinations.findOne({
      where: { id },
      relations: { hotels: true },
    });
    if (!destination) throw new NotFoundException('Destination not found');
    if (destination.hotels.length > 0) {
      const hotelNames = destination.hotels
        .map((hotel) => hotel.name)
        .filter(Boolean)
        .join(', ');
      throw new ConflictException(
        `This destination has associated hotels and cannot be deleted: ${hotelNames}.`,
      );
    }
    await this.destinations.delete(id);
  }

  async update(id: string, dto: UpdateDestinationDto): Promise<Destination> {
    this.tenantContext.require();
    const destination = await this.destinations.findOne({ where: { id } });
    if (!destination) throw new NotFoundException('Destination not found');
    Object.assign(destination, {
      ...dto,
      name: dto.name?.trim() ?? destination.name,
      slug: dto.name ? slugify(dto.name) : destination.slug,
      normalizedName: dto.name
        ? normalize(dto.name)
        : destination.normalizedName,
      countryCode:
        dto.countryCode?.trim().toLowerCase() ?? destination.countryCode,
    });
    return this.destinations.save(destination);
  }

  private normalizeRemote(
    result: NominatimResult,
  ): CreateDestinationDto | null {
    const address = result.address;
    const city = address ? cityOf(address) : '';
    const name = result.name ?? address?.road ?? address?.neighbourhood ?? city;
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (
      !address ||
      !name ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    )
      return null;
    return {
      name,
      originalName: result.name ?? name,
      street: address.road ?? '',
      city,
      state: address.state ?? '',
      country: address.country ?? '',
      countryCode: address.country_code ?? '',
      postalCode: address.postcode ?? '',
      latitude,
      longitude,
      displayName: result.display_name,
      source: 'nominatim',
      externalId: String(result.osm_id ?? result.place_id ?? ''),
    };
  }

  private fingerprint(dto: Partial<CreateDestinationDto>) {
    return [
      dto.name,
      dto.street,
      dto.city,
      dto.state,
      dto.country,
      dto.postalCode,
    ]
      .map((value) => normalize(value ?? ''))
      .join('|');
  }
}
