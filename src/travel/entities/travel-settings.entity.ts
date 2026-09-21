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

export type TravelGeneralDetail = {
  id: string;
  key: string;
  label: string;
  value: string;
};

@Entity('travel_settings')
@Index('UQ_travel_settings_tenant', ['tenantId'], { unique: true })
export class TravelSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 100, name: 'voucher_prefix', default: '' })
  voucherPrefix: string;

  @Column({ type: 'varchar', length: 100, name: 'voucher_suffix', default: '' })
  voucherSuffix: string;

  @Column({ type: 'varchar', length: 100, name: 'invoice_prefix', default: 'INV-' })
  invoicePrefix: string;

  @Column({ type: 'varchar', length: 100, name: 'invoice_suffix', default: '1001' })
  invoiceSuffix: string;

  @Column({ type: 'varchar', length: 16, name: 'default_currency', default: 'USD' })
  defaultCurrency: string;

  @Column({ type: 'varchar', length: 100, name: 'default_payment_type', default: 'Full Payment' })
  defaultPaymentType: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'default_tax_rate', default: 0 })
  defaultTaxRate: number;

  @Column({ type: 'jsonb', name: 'general_details', default: () => "'[]'::jsonb" })
  generalDetails: TravelGeneralDetail[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
