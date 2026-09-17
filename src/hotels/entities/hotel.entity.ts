import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Destination } from '../../destinations/entities/destination.entity';

@Entity({ name: 'hotels' })
@Index('IDX_hotels_name', ['normalizedName'])
@Index('UQ_hotels_destination_name', ['destinationId', 'normalizedName'], {
  unique: true,
})
export class Hotel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'destination_id' })
  destinationId: string;

  @ManyToOne(() => Destination, (destination) => destination.hotels, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'destination_id' })
  destination: Destination;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'normalized_name' })
  normalizedName: string;

  @Column({ type: 'varchar', length: 8, name: 'star_rating', default: '' })
  starRating: string;

  @Column({ type: 'text', default: '' })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
