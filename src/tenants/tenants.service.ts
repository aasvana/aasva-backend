import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { TermsService } from '../terms/terms.service';
import { DEFAULT_TENANT_ID, TRIAL_DURATION_DAYS } from './tenants.constants';
import type {
  SubscriptionStatus,
  TenantSubscription,
} from './tenants.constants';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly termsService: TermsService,
  ) {}

  async create(name: string): Promise<Tenant> {
    const slug = this.buildSlug(name);
    const tenant = this.tenantRepository.create({
      name,
      slug,
      subscriptionStatus: 'trial',
      subscriptionPlan: null,
      subscriptionPaidUntil: new Date(
        Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
      ),
    });
    const saved = await this.tenantRepository.save(tenant);
    await this.termsService.seedDefaultTerms(saved.id);
    return saved;
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { id } });
  }

  async rename(id: string, name: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    tenant.name = name;
    tenant.slug = this.buildSlug(name);
    return this.tenantRepository.save(tenant);
  }

  async getSubscription(tenantId: string): Promise<TenantSubscription | null> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: {
        id: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionPaidUntil: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return {
      status: tenant.subscriptionStatus as SubscriptionStatus,
      plan: tenant.subscriptionPlan,
      paidUntil: tenant.subscriptionPaidUntil,
    };
  }

  async setSubscription(
    tenantId: string,
    changes: {
      status: SubscriptionStatus;
      plan?: string | null;
      paidUntil?: Date | null;
    },
  ): Promise<TenantSubscription> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    tenant.subscriptionStatus = changes.status;
    if (changes.plan !== undefined) {
      tenant.subscriptionPlan = changes.plan;
    }
    if (changes.paidUntil !== undefined) {
      tenant.subscriptionPaidUntil = changes.paidUntil;
    }
    await this.tenantRepository.save(tenant);
    return {
      status: tenant.subscriptionStatus as SubscriptionStatus,
      plan: tenant.subscriptionPlan,
      paidUntil: tenant.subscriptionPaidUntil,
    };
  }

  async findDefault(): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: DEFAULT_TENANT_ID },
    });
    if (!tenant) {
      throw new NotFoundException(
        'Default tenant not found. Run migrations first.',
      );
    }
    return tenant;
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({ order: { name: 'ASC' } });
  }

  private buildSlug(name: string): string {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'tenant';
    return `${base}-${randomBytes(3).toString('hex')}`;
  }
}
