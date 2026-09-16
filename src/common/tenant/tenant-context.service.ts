import { AsyncLocalStorage } from 'node:async_hooks';
import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantContext {
  private readonly storage = new AsyncLocalStorage<string>();

  run<T>(tenantId: string, fn: () => T): T {
    return this.storage.run(tenantId, fn);
  }

  get(): string | undefined {
    return this.storage.getStore();
  }

  require(): string {
    const tenantId = this.storage.getStore();
    if (!tenantId) {
      throw new ForbiddenException('Request is not scoped to a tenant');
    }
    return tenantId;
  }
}
