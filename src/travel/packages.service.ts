import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { TenantContext } from '../common/tenant/tenant-context.service';
import { ImageKitService } from '../imagekit/imagekit.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import {
  Package,
  PackageDay,
  PackageExclusion,
  PackageImage,
  PackageInclusion,
} from './entities/package.entity';

const isDataUrl = (value: string) => /^data:image\//i.test(value);

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'package'
  );
}

@Injectable()
export class PackagesService {
  private readonly logger = new Logger(PackagesService.name);

  constructor(
    @InjectRepository(Package)
    private readonly packages: Repository<Package>,
    private readonly tenantContext: TenantContext,
    private readonly imageKitService: ImageKitService,
  ) {}

  async search(name?: string, destinationId?: string) {
    const where: Record<string, unknown> = {
      tenantId: this.tenantContext.require(),
    };
    if (name?.trim()) {
      where.normalizedName = ILike(`%${name.trim().toLowerCase()}%`);
    }
    if (destinationId) {
      where.destinationId = destinationId;
    }
    return this.packages.find({
      where,
      relations: { days: true, images: true },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async findOne(id: string) {
    const pkg = await this.packages.findOne({
      where: { id, tenantId: this.tenantContext.require() },
      relations: {
        destination: true,
        days: true,
        images: true,
        inclusions: true,
        exclusions: true,
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    sortPackageChildren(pkg);
    return pkg;
  }

  async findBySlug(slug: string) {
    const pkg = await this.packages.findOne({
      where: { slug, tenantId: this.tenantContext.require() },
      relations: {
        destination: true,
        days: true,
        images: true,
        inclusions: true,
        exclusions: true,
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    sortPackageChildren(pkg);
    return pkg;
  }

  async findPublishedBySlug(slug: string) {
    const pkg = await this.packages.findOne({
      where: { slug, isPublic: true, status: 'active' },
      relations: {
        destination: true,
        days: true,
        images: true,
        inclusions: true,
        exclusions: true,
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    sortPackageChildren(pkg);
    return pkg;
  }

  async create(dto: CreatePackageDto, createdBy?: string) {
    const tenantId = this.tenantContext.require();
    const name = dto.name.trim();
    const slug = await this.uniqueSlug(slugify(dto.slug || name), tenantId);
    const images = dto.images ? await this.resolveImages(dto.images) : [];
    const pkg = this.packages.create({
      tenantId,
      name,
      normalizedName: name.toLowerCase(),
      slug,
      shortDescription: dto.shortDescription ?? '',
      description: dto.description ?? '',
      destinationId: dto.destinationId ?? null,
      durationDays: dto.durationDays ?? this.guessDurationDays(dto.days),
      durationNights: dto.durationNights ?? 0,
      basePrice: dto.basePrice ?? 0,
      pricingType: dto.pricingType ?? 'PER_PERSON',
      status: dto.status ?? 'draft',
      isPublic: dto.isPublic ?? false,
      isFeatured: dto.isFeatured ?? false,
      createdBy: createdBy ?? null,
      days: dto.days.map((day) => ({ ...day })) as PackageDay[],
      images,
      inclusions: this.mapItems(dto.inclusions),
      exclusions: this.mapItems(dto.exclusions),
    });
    return this.packages.save(pkg);
  }

  async update(id: string, dto: UpdatePackageDto) {
    const pkg = await this.findOne(id);
    const tenantId = this.tenantContext.require();
    if (dto.name !== undefined) {
      pkg.name = dto.name.trim();
      pkg.normalizedName = dto.name.trim().toLowerCase();
    }
    if (dto.slug !== undefined || (dto.name !== undefined && !dto.slug)) {
      const forced = dto.slug?.trim() ? slugify(dto.slug) : slugify(pkg.name);
      pkg.slug = await this.uniqueSlug(forced, tenantId, id);
    }
    if (dto.shortDescription !== undefined)
      pkg.shortDescription = dto.shortDescription;
    if (dto.description !== undefined) pkg.description = dto.description;
    if (dto.destinationId !== undefined)
      pkg.destinationId = dto.destinationId ?? null;
    if (dto.durationDays !== undefined) pkg.durationDays = dto.durationDays;
    if (dto.durationNights !== undefined)
      pkg.durationNights = dto.durationNights;
    if (dto.basePrice !== undefined) pkg.basePrice = dto.basePrice;
    if (dto.pricingType !== undefined) pkg.pricingType = dto.pricingType;
    if (dto.status !== undefined) pkg.status = dto.status;
    if (dto.isPublic !== undefined) pkg.isPublic = dto.isPublic;
    if (dto.isFeatured !== undefined) pkg.isFeatured = dto.isFeatured;
    if (dto.days !== undefined) {
      pkg.days = dto.days.map((day) => ({ ...day })) as PackageDay[];
    }
    if (dto.images !== undefined) {
      pkg.images = await this.resolveImages(dto.images);
    }
    if (dto.inclusions !== undefined) {
      pkg.inclusions = this.mapItems(dto.inclusions);
    }
    if (dto.exclusions !== undefined) {
      pkg.exclusions = this.mapItems(dto.exclusions);
    }
    return this.packages.save(pkg);
  }

  async remove(id: string) {
    await this.packages.delete({ id, tenantId: this.tenantContext.require() });
  }

  private guessDurationDays(days: { dayOrder: number }[]): number {
    return Math.max(1, ...days.map((day) => day.dayOrder));
  }

  private mapItems(items?: { title: string; sortOrder?: number }[]) {
    if (!items) return [];
    return items.map(
      (item, index) =>
        ({ title: item.title, sortOrder: item.sortOrder ?? index }) as
          PackageInclusion | PackageExclusion,
    );
  }

  private async resolveImages(
    images: {
      imageUrl: string;
      altText?: string;
      sortOrder?: number;
      isCover?: boolean;
    }[],
  ) {
    const resolved: PackageImage[] = [];
    for (const [index, image] of images.entries()) {
      let url = image.imageUrl;
      if (isDataUrl(image.imageUrl)) {
        const uploaded = await this.imageKitService.upload(
          image.imageUrl,
          'package-image',
          '/packages',
        );
        if (uploaded) {
          url = uploaded.url;
        } else {
          this.logger.warn(
            'Package image could not be uploaded to ImageKit; storing the data URL instead.',
          );
        }
      }
      resolved.push({
        imageUrl: url,
        altText: image.altText ?? '',
        sortOrder: image.sortOrder ?? index,
        isCover: image.isCover ?? false,
      } as PackageImage);
    }
    return resolved;
  }

  private async uniqueSlug(
    baseSlug: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const existing = await this.packages.findOne({
        where: { slug, tenantId },
      });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }
}

function sortPackageChildren(pkg: Package) {
  pkg.days.sort((a, b) => a.dayOrder - b.dayOrder);
  pkg.images.sort((a, b) => a.sortOrder - b.sortOrder);
  pkg.inclusions.sort((a, b) => a.sortOrder - b.sortOrder);
  pkg.exclusions.sort((a, b) => a.sortOrder - b.sortOrder);
}
