export const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';

export const DEFAULT_TENANT_NAME = 'Aasvana';

export const TRIAL_DURATION_DAYS = 90;

export type SubscriptionStatus = 'trial' | 'active' | 'inactive';

export interface TenantSubscription {
  status: SubscriptionStatus;
  plan: string | null;
  paidUntil: Date | null;
}

export function isSubscriptionActive(
  subscription: TenantSubscription | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!subscription) return false;
  if (subscription.status === 'active') return true;
  if (subscription.status === 'trial') {
    return (
      subscription.paidUntil != null && subscription.paidUntil.getTime() >= now
    );
  }
  return false;
}
