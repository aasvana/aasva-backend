import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 100, name: 'slug', unique: true })
  slug: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'subscription_status',
    default: 'trial',
  })
  subscriptionStatus: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'subscription_plan',
    nullable: true,
  })
  subscriptionPlan: string | null;

  @Column({
    type: 'timestamptz',
    name: 'subscription_paid_until',
    nullable: true,
  })
  subscriptionPaidUntil: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
