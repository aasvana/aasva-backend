import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('company_settings')
export class CompanySetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 64, name: 'short_name', default: '' })
  shortName: string;

  @Column({ type: 'varchar', length: 255, name: 'email', default: '' })
  email: string;

  @Column({ type: 'varchar', length: 64, name: 'phone', default: '' })
  phone: string;

  @Column({ type: 'varchar', length: 500, name: 'address', default: '' })
  address: string;

  @Column({ type: 'varchar', length: 255, name: 'website', default: '' })
  website: string;

  @Column({ type: 'varchar', length: 500, name: 'tagline', default: '' })
  tagline: string;

  @Column({ type: 'text', name: 'logo', nullable: true })
  logo: string | null;

  @Column({ type: 'varchar', length: 16, name: 'currency', default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 64, name: 'gstin', default: '' })
  gstin: string;

  @Column({ type: 'varchar', length: 64, name: 'pan', default: '' })
  pan: string;

  @Column({ type: 'varchar', length: 64, name: 'tan', default: '' })
  tan: string;

  @Column({ type: 'varchar', length: 64, name: 'cin', default: '' })
  cin: string;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'default_tax_rate',
    default: 0,
  })
  defaultTaxRate: number;

  @Column({ type: 'varchar', length: 64, name: 'business_type', default: '' })
  businessType: string;

  @Column({
    type: 'varchar',
    length: 16,
    name: 'incorporation_date',
    default: '',
  })
  incorporationDate: string;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'authorized_signatory',
    default: '',
  })
  authorizedSignatory: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
