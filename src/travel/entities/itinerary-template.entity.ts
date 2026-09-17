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

@Entity('itinerary_templates')
@Index('IDX_itinerary_templates_tenant_subject', [
  'tenantId',
  'normalizedSubject',
])
export class ItineraryTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'tenant_id' }) tenantId: string;
  @Column({ type: 'varchar', length: 255 }) subject: string;
  @Column({ type: 'varchar', length: 255, name: 'normalized_subject' })
  normalizedSubject: string;
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  price: number;
  @Column({ type: 'varchar', length: 20, default: 'active' }) status: string;
  @OneToMany(() => ItineraryTemplateDay, (day) => day.template, {
    cascade: true,
  })
  days: ItineraryTemplateDay[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('itinerary_template_days')
@Index('IDX_itinerary_template_days_order', ['templateId', 'dayOrder'])
export class ItineraryTemplateDay {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'template_id' }) templateId: string;
  @Column({ type: 'integer', name: 'day_order' }) dayOrder: number;
  @Column({ type: 'varchar', length: 255 }) subject: string;
  @Column({ type: 'text' }) description: string;
  @ManyToOne(() => ItineraryTemplate, (template) => template.days, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: ItineraryTemplate;
}
