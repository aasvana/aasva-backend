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
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('company_settings')
@Index('UQ_company_settings_tenant', ['tenantId'], { unique: true })
export class CompanySetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

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
