import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Hotel } from '../../hotels/entities/hotel.entity';

@Entity({ name: 'destinations' })
@Index('IDX_destinations_name', ['normalizedName'])
@Index('IDX_destinations_external', ['externalId'])
@Index('UQ_destinations_fingerprint', ['fingerprint'], { unique: true })
export class Destination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'original_name',
    nullable: true,
  })
  originalName: string | null;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'varchar', length: 255, name: 'normalized_name' })
  normalizedName: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  street: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  city: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  state: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  country: string;

  @Column({ type: 'varchar', length: 8, name: 'country_code', default: '' })
  countryCode: string;

  @Column({ type: 'varchar', length: 32, name: 'postal_code', default: '' })
  postalCode: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'text', name: 'display_name', default: '' })
  displayName: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  source: string | null;

  @Column({ type: 'varchar', length: 255, name: 'external_id', nullable: true })
  externalId: string | null;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 512 })
  fingerprint: string;

  @OneToMany(() => Hotel, (hotel) => hotel.destination)
  hotels: Hotel[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
