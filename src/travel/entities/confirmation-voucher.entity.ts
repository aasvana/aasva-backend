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

@Entity('confirmation_vouchers')
@Index('UQ_confirmation_vouchers_tenant_voucher', ['tenantId', 'voucherNo'], {
  unique: true,
})
export class ConfirmationVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_confirmation_vouchers_tenant_id')
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 64, name: 'voucher_no' })
  voucherNo: string;

  @Index('IDX_confirmation_vouchers_customer_name')
  @Column({ type: 'varchar', length: 255, name: 'customer_name' })
  customerName: string;

  @Column({ type: 'varchar', length: 255, name: 'company_name', default: '' })
  companyName: string;

  @Column({ type: 'varchar', length: 255, name: 'agent_name', default: '' })
  agentName: string;

  @Column({ type: 'varchar', length: 64, name: 'payment_type', default: '' })
  paymentType: string;

  @Index('IDX_confirmation_vouchers_journey_date')
  @Column({ type: 'timestamptz', name: 'journey_date', nullable: true })
  journeyDate: Date | null;

  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;

  @Index('IDX_confirmation_vouchers_package_id')
  @Column({ type: 'uuid', name: 'package_id', nullable: true })
  packageId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
