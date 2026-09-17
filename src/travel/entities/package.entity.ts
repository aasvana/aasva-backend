import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Destination } from '../../destinations/entities/destination.entity';

@Entity('packages')
@Index('IDX_packages_tenant_name', ['tenantId', 'normalizedName'])
export class Package {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 255, name: 'normalized_name' })
  normalizedName: string;
  @Index('IDX_packages_tenant_slug', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  slug: string;
  @Column({ type: 'text', name: 'short_description', default: '' })
  shortDescription: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ type: 'uuid', name: 'destination_id', nullable: true })
  destinationId: string | null;
  @ManyToOne(() => Destination, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'destination_id' })
  destination: Destination | null;
  @Column({ type: 'integer', name: 'duration_days', default: 1 })
  durationDays: number;
  @Column({ type: 'integer', name: 'duration_nights', default: 0 })
  durationNights: number;
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'base_price',
    default: 0,
  })
  basePrice: number;
  @Column({
    type: 'varchar',
    length: 20,
    name: 'pricing_type',
    default: 'PER_PERSON',
  })
  pricingType: string;
  @Column({ type: 'varchar', length: 20, default: 'active' }) status: string;
  @Column({ type: 'boolean', name: 'is_public', default: false })
  isPublic: boolean;
  @Column({ type: 'boolean', name: 'is_featured', default: false })
  isFeatured: boolean;
  @Column({ type: 'uuid', name: 'created_by', nullable: true }) createdBy:
    string | null;
  @OneToMany(() => PackageDay, (day) => day.pkg, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  days: PackageDay[];
  @OneToMany(() => PackageImage, (image) => image.pkg, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  images: PackageImage[];
  @OneToMany(() => PackageInclusion, (item) => item.pkg, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  inclusions: PackageInclusion[];
  @OneToMany(() => PackageExclusion, (item) => item.pkg, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  exclusions: PackageExclusion[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('package_days')
@Index('IDX_package_days_package_order', ['packageId', 'dayOrder'])
export class PackageDay {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'package_id' }) packageId: string;
  @Column({ type: 'integer', name: 'day_order' }) dayOrder: number;
  @Column({ type: 'varchar', length: 255 }) subject: string;
  @Column({ type: 'text' }) description: string;
  @ManyToOne(() => Package, (pkg) => pkg.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  pkg: Package;
}

@Entity('package_images')
@Index('IDX_package_images_package_order', ['packageId', 'sortOrder'])
export class PackageImage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'package_id' }) packageId: string;
  @Column({ type: 'text', name: 'image_url' }) imageUrl: string;
  @Column({ type: 'varchar', length: 255, name: 'alt_text', default: '' })
  altText: string;
  @Column({ type: 'integer', name: 'sort_order', default: 0 })
  sortOrder: number;
  @Column({ type: 'boolean', name: 'is_cover', default: false })
  isCover: boolean;
  @ManyToOne(() => Package, (pkg) => pkg.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  pkg: Package;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('package_inclusions')
@Index('IDX_package_inclusions_package_order', ['packageId', 'sortOrder'])
export class PackageInclusion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'package_id' }) packageId: string;
  @Column({ type: 'varchar', length: 255 }) title: string;
  @Column({ type: 'integer', name: 'sort_order', default: 0 })
  sortOrder: number;
  @ManyToOne(() => Package, (pkg) => pkg.inclusions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  pkg: Package;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('package_exclusions')
@Index('IDX_package_exclusions_package_order', ['packageId', 'sortOrder'])
export class PackageExclusion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'package_id' }) packageId: string;
  @Column({ type: 'varchar', length: 255 }) title: string;
  @Column({ type: 'integer', name: 'sort_order', default: 0 })
  sortOrder: number;
  @ManyToOne(() => Package, (pkg) => pkg.exclusions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  pkg: Package;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
