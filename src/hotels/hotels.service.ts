import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { Destination } from '../destinations/entities/destination.entity';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { SearchHotelsQueryDto } from './dto/search-hotels-query.dto';
import { Hotel } from './entities/hotel.entity';
import { capitalizeWords } from '../common/utils/text-format.util';

@Injectable()
export class HotelsService {
  constructor(
    @InjectRepository(Hotel) private readonly hotels: Repository<Hotel>,
    @InjectRepository(Destination)
    private readonly destinations: Repository<Destination>,
    private readonly tenantContext: TenantContext,
  ) {}

  async search(query: SearchHotelsQueryDto['q']): Promise<Hotel[]> {
    this.tenantContext.require();
    return this.hotels
      .createQueryBuilder('hotel')
      .leftJoinAndSelect('hotel.destination', 'destination')
      .where('1 = 1')
      .andWhere('hotel.normalized_name LIKE :query', {
        query: `%${query.trim().toLowerCase()}%`,
      })
      .limit(20)
      .getMany();
  }

  async findAll(): Promise<Hotel[]> {
    this.tenantContext.require();
    return this.hotels.find({
      relations: { destination: true },
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateHotelDto): Promise<Hotel> {
    this.tenantContext.require();
    const name = capitalizeWords(dto.name);
    const destination = await this.destinations.findOne({
      where: { id: dto.destinationId },
    });
    if (!destination) throw new NotFoundException('Destination not found');
    const existing = await this.hotels.findOne({
      where: {
        destinationId: dto.destinationId,
        normalizedName: name.toLowerCase(),
      },
    });
    if (existing) return existing;
    const hotel = this.hotels.create({
      ...dto,
       name,
       normalizedName: name.toLowerCase(),
      starRating: dto.starRating ?? '',
      notes: dto.notes ?? '',
      destination,
    });
    return this.hotels.save(hotel);
  }

  async update(id: string, dto: CreateHotelDto): Promise<Hotel> {
    this.tenantContext.require();
    const name = capitalizeWords(dto.name);
    const hotel = await this.hotels.findOne({ where: { id } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    const destination = await this.destinations.findOne({
      where: { id: dto.destinationId },
    });
    if (!destination) throw new NotFoundException('Destination not found');
    const normalizedName = name.toLowerCase();
    const duplicate = await this.hotels.findOne({
      where: { destinationId: dto.destinationId, normalizedName },
    });
    if (duplicate && duplicate.id !== id) return duplicate;
    Object.assign(hotel, {
       name,
      normalizedName,
      destinationId: dto.destinationId,
      destination,
      starRating: dto.starRating ?? '',
      notes: dto.notes ?? '',
    });
    return this.hotels.save(hotel);
  }

  async byDestination(destinationId: string): Promise<Hotel[]> {
    return this.hotels.find({
      where: { destinationId },
      relations: { destination: true },
    });
  }

  async remove(id: string): Promise<void> {
    this.tenantContext.require();
    const hotel = await this.hotels.findOne({ where: { id } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    await this.hotels.delete(id);
  }
}
