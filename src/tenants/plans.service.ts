import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
  ) {}

  findAll(): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      order: { durationDays: 'ASC' },
    });
  }

  async findByKey(key: string): Promise<SubscriptionPlan | null> {
    return this.planRepository.findOne({ where: { key } });
  }
}
