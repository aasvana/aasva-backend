import { SetMetadata } from '@nestjs/common';

export const SKIP_SUBSCRIPTION_GATE_KEY = 'skipSubscriptionGate';

export const SkipSubscriptionGate = () =>
  SetMetadata(SKIP_SUBSCRIPTION_GATE_KEY, true);
