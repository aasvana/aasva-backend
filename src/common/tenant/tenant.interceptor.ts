import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { TenantContext } from './tenant-context.service';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { DEFAULT_TENANT_ID } from '../../tenants/tenants.constants';
import { SKIP_SUBSCRIPTION_GATE_KEY } from '../decorators/skip-subscription-gate.decorator';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContext: TenantContext,
    private readonly reflector: Reflector,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{
      user?: { tenantId?: string; roles?: string[] };
    }>();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      return next.handle();
    }

    const isPlatformRole =
      request.user?.roles?.includes('systemadmin') ||
      request.user?.roles?.includes('superadmin');

    if (
      tenantId !== DEFAULT_TENANT_ID &&
      !isPlatformRole &&
      !this.isGateSkipped(context)
    ) {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
        select: {
          id: true,
          subscriptionStatus: true,
          subscriptionPaidUntil: true,
        },
      });
      if (tenant) {
        const active =
          tenant.subscriptionStatus === 'active' ||
          (tenant.subscriptionStatus === 'trial' &&
            tenant.subscriptionPaidUntil != null &&
            tenant.subscriptionPaidUntil.getTime() >= Date.now());
        if (!active) {
          throw new HttpException(
            {
              message:
                'Subscription required. Your subscription is inactive or has expired.',
              error: 'Payment Required',
            },
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
      }
    }

    return new Observable<unknown>((subscriber) => {
      this.tenantContext.run(tenantId, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });
      });
    });
  }

  private isGateSkipped(context: ExecutionContext): boolean {
    const handlerSkipped = this.reflector.get<boolean>(
      SKIP_SUBSCRIPTION_GATE_KEY,
      context.getHandler(),
    );
    if (handlerSkipped) return true;
    return (
      this.reflector.get<boolean>(
        SKIP_SUBSCRIPTION_GATE_KEY,
        context.getClass(),
      ) ?? false
    );
  }
}
